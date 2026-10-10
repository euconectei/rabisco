import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef } from 'react'
import { addChild, addSibling, createMap, deleteBranch, findNodeOf, navigate, relayout, type CommandResult } from './commands'
import { actionForKey } from './keyboard'
import type { Point } from './layout'
import { metaOf } from './model'

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

const selectedIds = (appState: Pick<AppState, 'selectedElementIds'>) =>
  Object.entries(appState.selectedElementIds).filter(([, on]) => on).map(([id]) => id)

const containerOf = (element: unknown) => (element as { containerId?: string | null } | null)?.containerId ?? null

export function useMindmap(api: MindmapApi | null, labels: MindmapLabels) {
  const labelsRef = useRef(labels)
  useEffect(() => {
    labelsRef.current = labels
  }, [labels])

  /** Opens text editing of the selected node, the way a real Enter on it would. */
  const startEditing = useCallback(() => {
    requestAnimationFrame(() => {
      const container = document.querySelector('.excalidraw')
      if (!container) return
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })
      Object.defineProperty(event, SYNTHETIC, { value: true })
      container.dispatchEvent(event)
    })
  }, [])

  const apply = useCallback(
    (result: CommandResult, edit: boolean) => {
      if (!api) return
      api.updateScene({
        elements: result.elements,
        appState: { selectedElementIds: result.select ? { [result.select]: true } : {} } as Partial<AppState>,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
      if (edit) startEditing()
    },
    [api, startEditing],
  )

  useEffect(() => {
    if (!api) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event as unknown as Record<symbol, unknown>)[SYNTHETIC]) return
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
        case 'delete':
          return apply(deleteBranch(elements, target.nodeId), false)
        case 'editText':
          return startEditing()
        case 'navigate': {
          const next = navigate(elements, target.nodeId, action.key)
          if (next) api.updateScene({ appState: { selectedElementIds: { [next]: true } } as Partial<AppState> })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [api, apply, startEditing])

  // When editing a node's text ends, its size may have changed: re-lay out that map.
  const editingNode = useRef<string | null>(null)
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: Pick<AppState, 'editingTextElement'>) => {
      const container = containerOf(appState.editingTextElement)
      if (container) {
        editingNode.current = container
        return
      }
      const finished = editingNode.current
      editingNode.current = null
      if (!finished || !api) return
      const node = elements.find((e) => e.id === finished)
      const meta = node ? metaOf(node) : null
      if (meta?.kind !== 'node') return
      api.updateScene({ elements: relayout(elements, meta.mapId), captureUpdate: CaptureUpdateAction.EVENTUALLY })
    },
    [api],
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
