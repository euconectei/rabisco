import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { act, renderHook } from '@testing-library/react'
import { addChild, createMap } from './commands'
import { metaOf, readMaps } from './model'
import { useMindmap, type MindmapApi } from './useMindmap'

const labels = { rootText: 'Ideia central', nodeText: 'Tópico' }

function fakeApi(elements: ExcalidrawElement[], selected: string[] = [], editing: unknown = null) {
  const state = { elements, appState: { selectedElementIds: Object.fromEntries(selected.map((id) => [id, true])), editingTextElement: editing } }
  const api: MindmapApi & { updateScene: ReturnType<typeof vi.fn> } = {
    getSceneElements: () => state.elements,
    getAppState: () => state.appState as never,
    updateScene: vi.fn((scene: { elements?: ExcalidrawElement[]; appState?: Record<string, unknown> }) => {
      if (scene.elements) state.elements = scene.elements
      if (scene.appState) state.appState = { ...state.appState, ...scene.appState } as typeof state.appState
    }),
  }
  return { api, state }
}

function press(k: string) {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
  window.dispatchEvent(event)
  return event
}

const nodeCount = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted && metaOf(e)?.kind === 'node').length

it('Tab on a selected node creates a child, selects it and stops the event', () => {
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api, state } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  const event = press('Tab')
  expect(event.defaultPrevented).toBe(true)
  expect(nodeCount(state.elements)).toBe(2)
  const child = [...readMaps(state.elements).values()][0].root.children[0].id
  expect(state.appState.selectedElementIds).toEqual({ [child]: true })
})

it('does not intercept Tab when no map node is selected', () => {
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [])
  renderHook(() => useMindmap(api, labels))
  expect(press('Tab').defaultPrevented).toBe(false)
  expect(api.updateScene).not.toHaveBeenCalled()
})

it('does not intercept Enter while a text is being edited', () => {
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!], { id: 'some-text' })
  renderHook(() => useMindmap(api, labels))
  expect(press('Enter').defaultPrevented).toBe(false)
})

it('does nothing with two nodes selected', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const { api } = fakeApi(r.elements, [root, r.select!])
  renderHook(() => useMindmap(api, labels))
  expect(press('Tab').defaultPrevented).toBe(false)
})

it('deletes a branch in a single scene update (one undo step)', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  r = addChild(r.elements, r.select!, 'A')
  const { api, state } = fakeApi(r.elements, [r.select!])
  renderHook(() => useMindmap(api, labels))
  press('Delete')
  expect(api.updateScene).toHaveBeenCalledTimes(1)
  expect(api.updateScene.mock.calls[0][0].captureUpdate).toBe('IMMEDIATELY')
  expect(nodeCount(state.elements)).toBe(1)
})

it('relayouts the map when editing a node text ends', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const { api, state } = fakeApi(r.elements)
  const { result } = renderHook(() => useMindmap(api, labels))
  const textOfA = state.elements.find((e) => (e as unknown as { containerId?: string }).containerId === a)!
  // Node A grows while its text is edited, overlapping B; when editing ends the map is re-laid out.
  const grown = state.elements.map((e) => (e.id === a ? ({ ...e, height: 200 } as ExcalidrawElement) : e))
  act(() => result.current.handleChange(grown, { editingTextElement: textOfA } as never))
  expect(api.updateScene).not.toHaveBeenCalled()
  act(() => result.current.handleChange(grown, { editingTextElement: null } as never))
  expect(api.updateScene).toHaveBeenCalledTimes(1)
})

it('ignores the synthetic Enter Rabisco itself dispatches to start editing', () => {
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!])
  const { result } = renderHook(() => useMindmap(api, labels))
  const container = document.createElement('div')
  container.className = 'excalidraw'
  document.body.appendChild(container)
  act(() => result.current.startEditing())
  expect(api.updateScene).not.toHaveBeenCalled()
  container.remove()
})
