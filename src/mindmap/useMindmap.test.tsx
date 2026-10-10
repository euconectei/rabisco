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

it.each([
  ['input', () => document.createElement('input')],
  ['textarea', () => document.createElement('textarea')],
  ['select', () => document.createElement('select')],
  ['contenteditable', () => Object.assign(document.createElement('div'), { contentEditable: 'true' })],
])('never takes keys typed in a %s (title field, color picker, search…)', (_label, make) => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  r = addChild(r.elements, r.select!, 'A')
  const { api, state } = fakeApi(r.elements, [r.select!])
  renderHook(() => useMindmap(api, labels))
  const field = make()
  document.body.appendChild(field)
  for (const key of ['Backspace', 'Delete', 'Enter', 'Tab', 'ArrowLeft']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    field.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  }
  expect(api.updateScene).not.toHaveBeenCalled()
  expect(nodeCount(state.elements)).toBe(2)
  field.remove()
})

it('does not hold keys typed in a field while a new node is opening', () => {
  vi.useFakeTimers()
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!])
  renderHook(() => useMindmap(api, labels))
  press('Tab')
  const input = document.createElement('input')
  document.body.appendChild(input)
  const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
  input.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  input.remove()
  vi.useRealTimers()
})

describe('self-healing layout', () => {
  function drifted() {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    const root = r.select!
    r = addChild(r.elements, root, 'A')
    const a = r.select!
    r = addChild(r.elements, root, 'B')
    const shifted = r.elements.map((e) => (e.id === a ? ({ ...e, y: e.y + 50, versionNonce: 99 } as ExcalidrawElement) : e))
    return { elements: shifted, a }
  }

  it('re-lays out a map that drifted (undo, redo, paste), outside the undo history', () => {
    const { elements, a } = drifted()
    const { api } = fakeApi(elements)
    const { result } = renderHook(() => useMindmap(api, labels))
    act(() => result.current.handleChange(elements, { editingTextElement: null, selectedElementsAreBeingDragged: false } as never))
    expect(api.updateScene).toHaveBeenCalledTimes(1)
    const call = api.updateScene.mock.calls[0][0]
    expect(call.captureUpdate).toBe('NEVER')
    expect(call.elements.find((e: ExcalidrawElement) => e.id === a).y).toBe(elements.find((e) => e.id === a)!.y - 50)
  })

  it('leaves a map alone while a node is dragged or a text is edited', () => {
    const { elements } = drifted()
    const { api } = fakeApi(elements)
    const { result } = renderHook(() => useMindmap(api, labels))
    act(() => result.current.handleChange(elements, { editingTextElement: null, selectedElementsAreBeingDragged: true } as never))
    act(() => result.current.handleChange(elements, { editingTextElement: { id: 't' }, selectedElementsAreBeingDragged: false } as never))
    expect(api.updateScene).not.toHaveBeenCalled()
  })

  it('does not touch a map that is already laid out', () => {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    r = addChild(r.elements, r.select!, 'A')
    const { api } = fakeApi(r.elements)
    const { result } = renderHook(() => useMindmap(api, labels))
    act(() => result.current.handleChange(r.elements, { editingTextElement: null, selectedElementsAreBeingDragged: false } as never))
    expect(api.updateScene).not.toHaveBeenCalled()
  })
})

it('cancels pending editor work when the editor goes away', async () => {
  vi.useFakeTimers()
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!])
  const { unmount } = renderHook(() => useMindmap(api, labels))
  press('Tab') // schedules opening the new node's editor
  unmount()
  const container = document.createElement('div')
  container.className = 'excalidraw'
  const received: string[] = []
  container.addEventListener('keydown', (e) => received.push(e.key))
  document.body.appendChild(container)
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(received).toEqual([])
  container.remove()
  vi.useRealTimers()
})

function pressWith(k: string, mods: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods })
  window.dispatchEvent(event)
  return event
}

it('Ctrl/Cmd + . collapses the selected node and then expands it, in one undo step each', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const { api, state } = fakeApi(r.elements, [root])
  renderHook(() => useMindmap(api, labels))
  expect(pressWith('.', { ctrlKey: true }).defaultPrevented).toBe(true)
  expect(nodeCount(state.elements)).toBe(1)
  expect((metaOf(state.elements.find((e) => e.id === root)!) as { collapsed?: boolean }).collapsed).toBe(true)
  expect(api.updateScene).toHaveBeenLastCalledWith(expect.objectContaining({ captureUpdate: 'IMMEDIATELY' }))
  pressWith('.', { metaKey: true })
  expect(nodeCount(state.elements)).toBe(2)
  expect(state.appState.selectedElementIds).toEqual({ [root]: true })
})

it('Ctrl + . does nothing while a text is being edited', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const { api } = fakeApi(r.elements, [root], { id: 'some-text' })
  renderHook(() => useMindmap(api, labels))
  expect(pressWith('.', { ctrlKey: true }).defaultPrevented).toBe(false)
  expect(api.updateScene).not.toHaveBeenCalled()
})

describe('dragging a node', () => {
  function twoBranches() {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    const root = r.select!
    r = addChild(r.elements, root, 'A')
    const a = r.select!
    r = addChild(r.elements, root, 'B')
    const b = r.select!
    r = addChild(r.elements, root, 'C')
    return { elements: r.elements, root, a, b, c: r.select! }
  }
  const moveTo = (els: readonly ExcalidrawElement[], id: string, x: number, y: number) =>
    els.map((e) => (e.id === id ? ({ ...e, x, y, version: e.version + 1 } as ExcalidrawElement) : e))
  const dragEnd = (result: { current: ReturnType<typeof useMindmap> }, els: readonly ExcalidrawElement[], selected: string) => {
    const appState = { editingTextElement: null, selectedElementIds: { [selected]: true } }
    act(() => result.current.handleChange(els, { ...appState, selectedElementsAreBeingDragged: true } as never))
    act(() => result.current.handleChange(els, { ...appState, selectedElementsAreBeingDragged: false } as never))
  }

  it('dropped on another node, moves the branch there in one undo step', () => {
    const t = twoBranches()
    const target = t.elements.find((e) => e.id === t.b)!
    const dropped = moveTo(t.elements, t.c, target.x + 5, target.y + 2)
    const { api, state } = fakeApi(dropped, [t.c])
    const { result } = renderHook(() => useMindmap(api, labels))
    dragEnd(result, dropped, t.c)
    expect(api.updateScene).toHaveBeenCalledTimes(1)
    expect(api.updateScene).toHaveBeenCalledWith(expect.objectContaining({ captureUpdate: 'IMMEDIATELY' }))
    const map = [...readMaps(state.elements).values()][0]
    expect(map.byId.get(t.c)!.parentId).toBe(t.b)
  })

  it('dropped on empty canvas, goes back to its place', () => {
    const t = twoBranches()
    const before = t.elements.find((e) => e.id === t.c)!
    const dropped = moveTo(t.elements, t.c, 3000, 3000)
    const { api, state } = fakeApi(dropped, [t.c])
    const { result } = renderHook(() => useMindmap(api, labels))
    dragEnd(result, dropped, t.c)
    const after = state.elements.find((e) => e.id === t.c)!
    expect([after.x, after.y]).toEqual([before.x, before.y])
    expect([...readMaps(state.elements).values()][0].byId.get(t.c)!.parentId).toBe(t.root)
  })

  it('dragging the root brings the whole map to the new position', () => {
    const t = twoBranches()
    const root = t.elements.find((e) => e.id === t.root)!
    const a = t.elements.find((e) => e.id === t.a)!
    const dropped = moveTo(t.elements, t.root, root.x + 300, root.y + 100)
    const { api, state } = fakeApi(dropped, [t.root])
    const { result } = renderHook(() => useMindmap(api, labels))
    dragEnd(result, dropped, t.root)
    const movedA = state.elements.find((e) => e.id === t.a)!
    expect([movedA.x - a.x, movedA.y - a.y]).toEqual([300, 100])
  })
})

it('perform runs a keyboard command on the selected node (touch toolbar)', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const { api, state } = fakeApi(r.elements, [root])
  const { result } = renderHook(() => useMindmap(api, labels))
  act(() => result.current.perform({ type: 'toggleCollapse' }))
  expect(nodeCount(state.elements)).toBe(1)
  act(() => result.current.perform({ type: 'toggleCollapse' }))
  act(() => result.current.perform({ type: 'addChild' }))
  expect(nodeCount(state.elements)).toBe(3)
})

it('perform does nothing without a selected node or while a text is edited', () => {
  const map = createMap([], { x: 0, y: 0 }, 'Raiz')
  const { api } = fakeApi(map.elements, [map.select!], { id: 't' })
  const { result } = renderHook(() => useMindmap(api, labels))
  act(() => result.current.perform({ type: 'addChild' }))
  expect(api.updateScene).not.toHaveBeenCalled()
})

it('Tab on a collapsed node expands it and adds the child after the hidden ones', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  const { api, state } = fakeApi(r.elements, [root])
  const { result } = renderHook(() => useMindmap(api, labels))
  act(() => result.current.perform({ type: 'toggleCollapse' }))
  act(() => result.current.perform({ type: 'addChild' }))
  const tree = [...readMaps(state.elements).values()][0]
  expect(tree.root.children.map((c) => c.id)[0]).toBe(a)
  expect(tree.root.children).toHaveLength(2)
  expect(new Set(tree.root.children.map((c) => c.order)).size).toBe(2)
  expect((metaOf(state.elements.find((e) => e.id === root)!) as { collapsed?: boolean }).collapsed).toBeFalsy()
})

it('a pasted script with # comments stays text (strict outline rule)', () => {
  const { api } = fakeApi([], [])
  const { result } = renderHook(() => useMindmap(api, labels))
  let taken = true
  act(() => {
    taken = result.current.pasteOutline('# install deps\nnpm i\n# run\nnpm start', { x: 0, y: 0 }, 'F')
  })
  expect(taken).toBe(false)
  expect(api.updateScene).not.toHaveBeenCalled()
})
