import { CaptureUpdateAction, hashElementsVersion, viewportCoordsToSceneCoords } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { addChild, addSibling, branchElementIds, createMap, findNodeOf, layoutDrift, navigate, relayout, type CommandResult } from './commands'
import { expand, toggleCollapse } from './collapse'
import { nodeAtPoint } from './dragBranch'
import { importOutline } from './importMap'
import { actionForKey, type MindmapAction } from './keyboard'
import type { Point } from './layout'
import { markManualColors } from './manualColor'
import { parseMarkdownOutline } from './markdown'
import { layoutOf, metaOf, readMaps } from './model'
import { dropTarget, reparent } from './reparent'

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

/**
 * Keys typed in a field (title, color hex, library search…), inside a dialog (such as the Organize
 * panel) or on a control marked `data-own-keys` are never mind map commands. Other buttons keep them:
 * focus stays on "Mapa mental" right after it is clicked.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.contentEditable === 'true' ||
    target.closest('[role="dialog"], [data-own-keys]') !== null
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

  /** Runs a command on the selected map node; false when there is none (or a text is being edited). */
  const perform = useCallback(
    (action: MindmapAction): boolean => {
      if (!api) return false
      const appState = api.getAppState()
      if (appState.editingTextElement) return false
      const elements = api.getSceneElements()
      const target = findNodeOf(elements, selectedIds(appState))
      if (!target) return false
      const { nodeText } = labelsRef.current
      // A new child of a collapsed node goes after the hidden ones: expand it first.
      const expanded = () => expand(elements, target.nodeId).elements
      const isRoot = readMaps(elements).get(target.mapId)?.root.id === target.nodeId
      switch (action.type) {
        case 'addChild':
          apply(addChild(expanded(), target.nodeId, nodeText), true)
          break
        case 'addSibling':
          // On the root, Enter adds a child too.
          apply(addSibling(isRoot ? expanded() : elements, target.nodeId, nodeText), true)
          break
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
          break
        }
        case 'editText':
          startEditing(target.nodeId)
          break
        case 'toggleCollapse':
          apply(toggleCollapse(elements, target.nodeId), false)
          break
        case 'navigate': {
          const next = navigate(elements, target.nodeId, action.key)
          if (next) api.updateScene({ appState: { selectedElementIds: { [next]: true } } as Partial<AppState> })
        }
      }
      return true
    },
    [api, apply, startEditing, sendToExcalidraw, later],
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
      if (!action || !perform(action)) return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [api, perform])

  // Layout is derived state: it never enters the undo history (CaptureUpdateAction.NEVER). Whenever
  // the scene changes for any reason (undo, redo, paste, a text edit), maps that drifted from their
  // layout are put back. Not while a node is dragged or a text is being edited.
  // Hand-picked node colors are detected here too (spec 5.5).
  const lastHealKey = useRef<number | null>(null)
  const heal = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (!api) return
      const key = hashElementsVersion(elements)
      if (key === lastHealKey.current) return
      lastHealKey.current = key
      // A node painted by hand turns manual first, so the relayout below keeps its color.
      let next: readonly ExcalidrawElement[] = markManualColors(elements)
      for (const mapId of readMaps(elements).keys()) {
        // Free maps keep the user's positions; heal only the automatic layouts.
        if (layoutOf(elements, mapId) === 'free') continue
        if (layoutDrift(next, mapId)) next = relayout(next, mapId)
      }
      if (next !== elements) api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.NEVER })
    },
    [api],
  )

  // When editing a node's text ends, its size may have changed: re-lay out that map.
  const editingNode = useRef<string | null>(null)
  // A drag in progress: when it ends over another node of the same map, the branch moves there.
  const dragging = useRef(false)
  // The node under the pointer when a drag starts. In free layout the whole branch gets selected for
  // the drag, so the dragged node is remembered here instead of being read from the selection (which,
  // during the drag, is the whole branch). Stored in every layout; only the branch selection is free-only.
  const draggedNodeId = useRef<string | null>(null)
  // Whether the current drag selected a whole branch (free layout), so it can be undone in one step.
  const draggingBranch = useRef(false)

  // On pointerdown, before Excalidraw's own handler, remember the node under the pointer and (in free
  // layout) select its whole branch so the branch drags as one unit and native undo undoes it at once.
  // flushSync makes the new selection visible to Excalidraw's pointerdown handler in the same event.
  const onDragPointerDown = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!api) return
      const appState = api.getAppState() as AppState
      if (appState.editingTextElement) return
      const elements = api.getSceneElements()
      const scene = viewportCoordsToSceneCoords({ clientX: event.clientX, clientY: event.clientY }, appState)
      const nodeId = nodeAtPoint(elements, scene)
      draggedNodeId.current = nodeId
      draggingBranch.current = false
      if (!nodeId) return
      const meta = metaOf(elements.find((e) => e.id === nodeId)!)
      if (meta?.kind !== 'node' || layoutOf(elements, meta.mapId) !== 'free') return
      const ids = branchElementIds(elements, nodeId)
      draggingBranch.current = true
      flushSync(() => {
        api.updateScene({
          appState: { selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])) } as Partial<AppState>,
          captureUpdate: CaptureUpdateAction.NEVER,
        })
      })
    },
    [api],
  )

  // Set when the drop was already handled on pointerup, so the drag end seen in handleChange does not
  // reparent a second time.
  const reparentedOnPointerUp = useRef(false)

  // On pointerup, before Excalidraw's own handler (capture phase on window), reparent a node dropped on
  // another node. Excalidraw only records the drag in the undo history once its pointerup handler
  // runs, and an EVENTUALLY update is recorded together with the next captured one: the drag and the
  // new parent become a single undo step. Reparenting later, in handleChange, left two steps (the
  // second one undoing a drag that heal had already put back).
  const onDragPointerUp = useCallback(() => {
    if (!api) return
    const appState = api.getAppState() as AppState
    const draggedId = draggedNodeId.current
    if (!appState.selectedElementsAreBeingDragged || appState.editingTextElement || !draggedId) return
    const elements = api.getSceneElements()
    const target = dropTarget(elements, draggedId)
    if (!target) return
    reparentedOnPointerUp.current = true
    api.updateScene({ elements: reparent(elements, draggedId, target).elements, captureUpdate: CaptureUpdateAction.EVENTUALLY })
  }, [api])

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: Pick<AppState, 'editingTextElement'> &
        Partial<Pick<AppState, 'selectedElementsAreBeingDragged' | 'selectedElementIds'>>,
    ) => {
      const wasDragging = dragging.current
      dragging.current = !!appState.selectedElementsAreBeingDragged
      if (wasDragging && !dragging.current && api && !appState.editingTextElement) {
        const branchDrag = draggingBranch.current
        draggingBranch.current = false
        const draggedId = draggedNodeId.current
        const handledOnPointerUp = reparentedOnPointerUp.current
        reparentedOnPointerUp.current = false
        // Reparented on pointerup: what is left is selecting the dragged node, then laying the map out.
        const draggedMeta = draggedId ? metaOf(elements.find((e) => e.id === draggedId) ?? ({} as ExcalidrawElement)) : null
        if (draggedId && handledOnPointerUp && draggedMeta) {
          api.updateScene({
            // Excalidraw's own pointerup still applied the last pointer move to the dragged elements.
            elements: relayout(elements, draggedMeta.mapId),
            appState: { selectedElementIds: { [draggedId]: true } } as Partial<AppState>,
            captureUpdate: CaptureUpdateAction.NEVER,
          })
          return
        }
        const target = draggedId ? dropTarget(elements, draggedId) : null
        if (draggedId && target) {
          const result = reparent(elements, draggedId, target)
          api.updateScene({
            elements: result.elements,
            appState: { selectedElementIds: { [draggedId]: true } } as Partial<AppState>,
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          })
          return
        }
        // A free-layout branch drag: leave the branch where it was dropped and select only the node.
        if (branchDrag && draggedId) {
          api.updateScene({
            appState: { selectedElementIds: { [draggedId]: true } } as Partial<AppState>,
            captureUpdate: CaptureUpdateAction.NEVER,
          })
        }
      }
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

  /** Pasted lists and headings (2+ lines) become a map at `at`. Returns whether the paste was taken. */
  const pasteOutline = useCallback(
    (text: string, at: Point, fallbackRoot: string): boolean => {
      if (!api || api.getAppState().editingTextElement) return false
      if (text.split(/\r?\n/).filter((line) => line.trim()).length < 2) return false
      const outline = parseMarkdownOutline(text, fallbackRoot, { strict: true })
      if (!outline) return false
      apply(importOutline(api.getSceneElements(), outline, at), false)
      return true
    },
    [api, apply],
  )

  return { handleChange, createMapAt, startEditing, pasteOutline, perform, onDragPointerDown, onDragPointerUp }
}
