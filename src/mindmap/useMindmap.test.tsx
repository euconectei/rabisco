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

it('Delete selects the whole branch and hands the deletion to Excalidraw (native undo)', async () => {
  vi.useFakeTimers()
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  const { api, state } = fakeApi(r.elements, [a])
  renderHook(() => useMindmap(api, labels))
  const container = document.createElement('div')
  container.className = 'excalidraw'
  const received: string[] = []
  container.addEventListener('keydown', (e) => received.push(e.key))
  document.body.appendChild(container)
  expect(press('Delete').defaultPrevented).toBe(true)
  const selected = Object.keys(state.appState.selectedElementIds)
  expect(selected).toContain(a)
  expect(selected).not.toContain(root)
  expect(selected.length).toBe(3) // node, its text, its link
  await act(() => vi.advanceTimersByTimeAsync(50))
  expect(received).toEqual(['Delete'])
  container.remove()
  vi.useRealTimers()
})

it('after Excalidraw deletes a branch, re-lays out the map and selects the parent', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const { api } = fakeApi(r.elements, [a])
  const { result } = renderHook(() => useMindmap(api, labels))
  press('Delete')
  api.updateScene.mockClear()
  const deleted = r.elements.map((e) =>
    e.id === a || (e as unknown as { containerId?: string }).containerId === a || (metaOf(e)?.kind === 'edge' && (metaOf(e) as { childId: string }).childId === a)
      ? ({ ...e, isDeleted: true } as ExcalidrawElement)
      : e,
  )
  act(() => result.current.handleChange(deleted, { editingTextElement: null } as never))
  expect(api.updateScene).toHaveBeenCalledTimes(1)
  expect(api.updateScene.mock.calls[0][0].appState).toEqual({ selectedElementIds: { [root]: true } })
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
  // Excalidraw clears the selection when text editing ends; the node is selected again so the
  // keyboard flow continues (Tab, type, Esc, Tab…).
  expect(api.updateScene.mock.calls[0][0].appState).toEqual({ selectedElementIds: { [a]: true } })
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

it('keeps keys typed before the new node opens for editing, and types them into it', async () => {
  vi.useFakeTimers()
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api, state } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  press('Tab')
  const child = Object.keys(state.appState.selectedElementIds)[0]
  // Fast typist: these arrive before the editor opens. They must not reach Excalidraw as shortcuts.
  expect(press('e').defaultPrevented).toBe(true)
  expect(press('x').defaultPrevented).toBe(true)
  // Excalidraw opens the text editor of the new node with the default text selected.
  state.appState = { ...state.appState, editingTextElement: { containerId: child } }
  const textarea = document.createElement('textarea')
  textarea.className = 'excalidraw-wysiwyg'
  textarea.value = 'Tópico'
  document.body.appendChild(textarea)
  textarea.select()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(textarea.value).toBe('ex')
  // Once flushed, keys are no longer held back.
  expect(press('y').defaultPrevented).toBe(false)
  textarea.remove()
  vi.useRealTimers()
})

it('stops holding keys back if the editor never opens', async () => {
  vi.useFakeTimers()
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  press('Tab')
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(press('e').defaultPrevented).toBe(false)
  vi.useRealTimers()
})

it('never types the held keys into the previous node\'s editor still in the page', async () => {
  vi.useFakeTimers()
  const old = document.createElement('textarea')
  old.className = 'excalidraw-wysiwyg'
  document.body.appendChild(old)
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  press('Tab')
  press('p')
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(old.value).toBe('')
  old.remove()
  vi.useRealTimers()
})

it('applies an Esc pressed while keys are held after typing them', async () => {
  vi.useFakeTimers()
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api, state } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  press('Tab')
  const child = Object.keys(state.appState.selectedElementIds)[0]
  press('o')
  press('k')
  expect(press('Escape').defaultPrevented).toBe(true)
  state.appState = { ...state.appState, editingTextElement: { containerId: child } }
  const textarea = document.createElement('textarea')
  textarea.className = 'excalidraw-wysiwyg'
  document.body.appendChild(textarea)
  const blur = vi.spyOn(textarea, 'blur')
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(textarea.value).toBe('ok')
  expect(blur).toHaveBeenCalled()
  textarea.remove()
  vi.useRealTimers()
})
