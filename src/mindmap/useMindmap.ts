import { CaptureUpdateAction, hashElementsVersion } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef } from 'react'
import { addChild, addSibling, branchElementIds, createMap, findNodeOf, layoutDrift, navigate, relayout, type CommandResult } from './commands'
import { toggleCollapse } from './collapse'
import { actionForKey } from './keyboard'
import type { Point } from './layout'
import { metaOf, readMaps } from './model'

/** The slice of Excalidraw's imperative API the mind map needs (easy to fake in tests). */
export interface MindmapApi {
  getSceneElements(): readonly ExcalidrawElement[]
  getAppState(): Pick<AppState, 'selectedElementIds' | 'editingTextElement'>
  updateScene(scene: {
    elements?: readonly ExcalidrawElement[]
    appState?: Partial<AppState>
    captureUpdate?: (typeof CaptureUpdateAction)[keyof typeof CaptureUpdateAction]
  }): void
}

export interface MindmapLabels {
  rootText: string
  nodeText: string
}

// Marks the Enter we dispatch ourselves to open text editing, so our own listener lets it through.
const SYNTHETIC = Symbol('rabisco-synthetic')
const EDITOR_SELECTOR = 'textarea.excalidraw-wysiwyg'
const EDIT_WAIT_MS = 600
const POLL_MS = 16

/** Types into Excalidraw's text editor, replacing the selected default text. */
function insertText(textarea: HTMLTextAreaElement, text: string) {
  textarea.focus()
  if (document.execCommand?.('insertText', false, text)) return
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end')
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Keys typed in a field (title, color hex, library search, dialogs…) are never mind map commands. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.contentEditable === 'true'
  )
}

const isPrintable = (event: KeyboardEvent) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

const selectedIds = (appState: Pick<AppState, 'selectedElementIds'>) =>
  Object.entries(appState.selectedElementIds).filter(([, on]) => on).map(([id]) => id)

const containerOf = (element: unknown) => (element as { containerId?: string | null } | null)?.containerId ?? null

export function useMindmap(api: MindmapApi | null, labels: MindmapLabels) {
  const labelsRef = useRef(labels)
  useEffect(() => {
    labelsRef.current = labels
  }, [labels])

  // Keys typed between a command and the text editor opening (one or two frames). Without this a fast
  // typist's first letters would reach Excalidraw as tool shortcuts ("e" = eraser, "r" = rectangle…).
  const heldKeys = useRef<string | null>(null)
  // An Esc pressed while keys are held closes the editor right after they are typed in.
  const closeAfterTyping = useRef(false)

  // Timers for work that only makes sense while this editor is mounted (opening an editor, deleting).
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const later = useCallback((work: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id)
      work()
    }, ms)
    timers.current.add(id)
  }, [])
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const id of pending) clearTimeout(id)
      pending.clear()
    }
  }, [])

  // A branch handed to Excalidraw for deletion: once it is gone, re-lay out the map and select the parent.
  const pendingDelete = useRef<{ nodeId: string; mapId: string; parentId: string | null } | null>(null)

  /** Sends a key to Excalidraw as if typed on the canvas (our own listener lets it through). */
  const sendToExcalidraw = useCallback((key: string) => {
    const container = document.querySelector('.excalidraw')
    if (!container) return
    const event = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true })
    Object.defineProperty(event, SYNTHETIC, { value: true })
    container.dispatchEvent(event)
  }, [])

  /** Opens text editing of a node (selected beforehand), the way a real Enter on it would. */
  const startEditing = useCallback((nodeId: string | null = null) => {
    heldKeys.current = ''
    closeAfterTyping.current = false
    // The previous node's editor may still be in the DOM right after Esc: never type into that one.
    const stale = document.querySelector(EDITOR_SELECTOR)
    later(() => {
      sendToExcalidraw('Enter')
      const deadline = Date.now() + EDIT_WAIT_MS
      const poll = () => {
        const editor = document.querySelector<HTMLTextAreaElement>(EDITOR_SELECTOR)
        const editing = api?.getAppState().editingTextElement as { containerId?: string | null } | null | undefined
        const ready = editor && editor !== stale && (!nodeId || editing?.containerId === nodeId)
        if (ready) {
          const typed = heldKeys.current
          heldKeys.current = null
          if (typed) insertText(editor, typed)
          if (closeAfterTyping.current) {
            closeAfterTyping.current = false
            editor.blur() // Excalidraw commits the text on blur, like Esc
          }
          return
        }
        if (Date.now() >= deadline) heldKeys.current = null
        else later(poll, POLL_MS)
      }
      poll()
    }, POLL_MS)
  }, [api, later, sendToExcalidraw])

  const apply = useCallback(
    (result: CommandResult, edit: boolean) => {
      if (!api) return
      api.updateScene({
        elements: result.elements,
        appState: { selectedElementIds: result.select ? { [result.select]: true } : {} } as Partial<AppState>,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
      if (edit) startEditing(result.select)
    },
    [api, startEditing],
  )

  useEffect(() => {
    if (!api) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event as unknown as Record<symbol, unknown>)[SYNTHETIC]) return
      if (isEditableTarget(event.target)) return
      if (heldKeys.current !== null && (isPrintable(event) || event.key === 'Escape')) {
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Escape') closeAfterTyping.current = true
        else heldKeys.current += event.key
        return
      }
      const action = actionForKey(event)
      if (!action) return
      const appState = api.getAppState()
      if (appState.editingTextElement) return
      const elements = api.getSceneElements()
      const target = findNodeOf(elements, selectedIds(appState))
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      const { nodeText } = labelsRef.current
      switch (action.type) {
        case 'addChild':
          return apply(addChild(elements, target.nodeId, nodeText), true)
        case 'addSibling':
          return apply(addSibling(elements, target.nodeId, nodeText), true)
        case 'delete': {
          // Excalidraw's own delete keeps undo whole (deleting through updateScene left the node's
          // rectangle out of the undo history). Select the branch, then let Excalidraw delete it.
          const ids = branchElementIds(elements, target.nodeId)
          const parentId = readMaps(elements).get(target.mapId)?.byId.get(target.nodeId)?.parentId ?? null
          pendingDelete.current = { nodeId: target.nodeId, mapId: target.mapId, parentId }
          api.updateScene({
            appState: { selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])) } as Partial<AppState>,
            captureUpdate: CaptureUpdateAction.NEVER,
          })
          later(() => sendToExcalidraw('Delete'), POLL_MS)
          return
        }
        case 'editText':
          return startEditing(target.nodeId)
        case 'toggleCollapse':
          return apply(toggleCollapse(elements, target.nodeId), false)
        case 'navigate': {
          const next = navigate(elements, target.nodeId, action.key)
          if (next) api.updateScene({ appState: { selectedElementIds: { [next]: true } } as Partial<AppState> })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [api, apply, startEditing, sendToExcalidraw, later])

  // Layout is derived state: it never enters the undo history (CaptureUpdateAction.NEVER). Whenever
  // the scene changes for any reason (undo, redo, paste, a text edit), maps that drifted from their
  // layout are put back. Not while a node is dragged or a text is being edited.
  const lastHealKey = useRef<number | null>(null)
  const heal = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (!api) return
      const key = hashElementsVersion(elements)
      if (key === lastHealKey.current) return
      lastHealKey.current = key
      let next: readonly ExcalidrawElement[] = elements
      for (const mapId of readMaps(elements).keys()) {
        if (layoutDrift(next, mapId)) next = relayout(next, mapId)
      }
      if (next !== elements) api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.NEVER })
    },
    [api],
  )

  // When editing a node's text ends, its size may have changed: re-lay out that map.
  const editingNode = useRef<string | null>(null)
  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: Pick<AppState, 'editingTextElement'> & Partial<Pick<AppState, 'selectedElementsAreBeingDragged'>>,
    ) => {
      const deleting = pendingDelete.current
      if (deleting && api) {
        const node = elements.find((e) => e.id === deleting.nodeId)
        if (!node || node.isDeleted) {
          pendingDelete.current = null
          if (deleting.parentId) {
            api.updateScene({
              elements: relayout(elements, deleting.mapId),
              appState: { selectedElementIds: { [deleting.parentId]: true } } as Partial<AppState>,
              captureUpdate: CaptureUpdateAction.NEVER,
            })
          }
          return
        }
      }
      if (appState.editingTextElement) {
        const container = containerOf(appState.editingTextElement)
        if (container) editingNode.current = container
        return
      }
      const finished = editingNode.current
      editingNode.current = null
      if (!finished) {
        if (!appState.selectedElementsAreBeingDragged) heal(elements)
        return
      }
      if (!api) return
      const node = elements.find((e) => e.id === finished)
      const meta = node ? metaOf(node) : null
      if (meta?.kind !== 'node') return
      api.updateScene({
        elements: relayout(elements, meta.mapId),
        // Excalidraw clears the selection when text editing ends; keep the node selected so the
        // keyboard flow continues (Tab, type, Esc, Tab…).
        appState: { selectedElementIds: { [finished]: true } } as Partial<AppState>,
        captureUpdate: CaptureUpdateAction.NEVER,
      })
    },
    [api, heal],
  )

  const createMapAt = useCallback(
    (at: Point) => {
      if (!api) return
      apply(createMap(api.getSceneElements(), at, labelsRef.current.rootText), true)
    },
    [api, apply],
  )

  return { handleChange, createMapAt, startEditing }
}
