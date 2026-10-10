import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { addChild, createMap, layoutDrift } from './commands'
import { metaOf } from './model'
import { setLayout, setStyle } from './switchStyle'

type El = ExcalidrawElement & {
  text?: string
  containerId?: string | null
  strokeColor: string
  backgroundColor: string
  endBinding?: { elementId: string } | null
  textAlign?: string
}

const live = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted) as El[]
const rect = (els: readonly ExcalidrawElement[], id: string) => els.find((e) => e.id === id)! as El
const textOf = (els: readonly ExcalidrawElement[], id: string) => live(els).find((e) => e.containerId === id)?.text
const kind = (els: readonly ExcalidrawElement[], k: string) => live(els).filter((e) => metaOf(e)?.kind === k)
const boundEdges = (els: readonly ExcalidrawElement[]) => live(els).filter((e) => metaOf(e)?.kind === 'edge' && e.endBinding?.elementId != null)

/** A real map (Raiz → A, B; A → A1) laid out in boxes style. */
function sample() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  r = addChild(r.elements, a, 'A1')
  const a1 = r.select!
  const mapId = metaOf(rect(r.elements, root))!.mapId
  return { elements: r.elements, root, a, b, a1, mapId }
}

it('boxes → lines → boxes keeps node ids, texts and hand-picked colors', () => {
  const s = sample()
  const colored = s.elements.map((e) =>
    e.id === s.a
      ? ({ ...e, strokeColor: '#ff00ff', backgroundColor: '#00ff00', customData: { rabisco: { ...metaOf(e), colorAuto: false } } } as ExcalidrawElement)
      : e,
  )
  const nodeIds = (els: readonly ExcalidrawElement[]) =>
    new Set(live(els).filter((e) => metaOf(e)?.kind === 'node').map((e) => e.id))
  const textIds = (els: readonly ExcalidrawElement[]) =>
    new Set(live(els).filter((e) => e.containerId != null).map((e) => e.id))
  const beforeNodes = nodeIds(colored)
  const beforeTexts = textIds(colored)

  const lines = setStyle(colored, s.mapId, 'lines').elements
  const aInLines = rect(lines, s.a)
  expect(aInLines.strokeColor).toBe('transparent')
  expect(aInLines.backgroundColor).toBe('transparent')
  expect((metaOf(aInLines) as { boxColors?: { strokeColor: string; backgroundColor: string } }).boxColors).toEqual({
    strokeColor: '#ff00ff',
    backgroundColor: '#00ff00',
  })

  const boxes = setStyle(lines, s.mapId, 'boxes').elements
  const aInBoxes = rect(boxes, s.a)
  expect(aInBoxes.strokeColor).toBe('#ff00ff')
  expect(aInBoxes.backgroundColor).toBe('#00ff00')
  expect(nodeIds(boxes)).toEqual(beforeNodes)
  expect(textIds(boxes)).toEqual(beforeTexts)
  expect(textOf(boxes, s.a)).toBe('A')
  expect(textOf(boxes, s.a1)).toBe('A1')
})

it('setStyle produces the expected decorations in each direction', () => {
  const s = sample()
  const lines = setStyle(s.elements, s.mapId, 'lines').elements
  expect(kind(lines, 'underline')).toHaveLength(3)
  expect(kind(lines, 'knob')).toHaveLength(1)
  expect(kind(lines, 'edge')).toHaveLength(3)
  expect(boundEdges(lines)).toHaveLength(0)

  const boxes = setStyle(lines, s.mapId, 'boxes').elements
  expect(kind(boxes, 'underline')).toHaveLength(0)
  expect(kind(boxes, 'knob')).toHaveLength(0)
  expect(boundEdges(boxes)).toHaveLength(3)
})

it("setLayout('right') records the layout and keeps each branch's side", () => {
  const s = sample()
  const sidesBefore = [s.a, s.b, s.a1].map((id) => (metaOf(rect(s.elements, id)) as { side: unknown }).side)
  const right = setLayout(s.elements, s.mapId, 'right').elements
  expect((metaOf(rect(right, s.root)) as { layout: unknown }).layout).toBe('right')
  expect([s.a, s.b].map((id) => (metaOf(rect(right, id)) as { side: unknown }).side)).toEqual(sidesBefore.slice(0, 2))
  for (const id of [s.a, s.b]) expect(rect(right, id).x).toBeGreaterThan(rect(right, s.root).x)
})

it("setLayout('free') keeps every node where it is", () => {
  const s = sample()
  const moved = s.elements.map((e) => (e.id === s.a ? ({ ...e, x: e.x + 111, y: e.y + 7 } as ExcalidrawElement) : e))
  const free = setLayout(moved, s.mapId, 'free').elements
  for (const id of [s.root, s.a, s.b, s.a1]) {
    expect([rect(free, id).x, rect(free, id).y]).toEqual([rect(moved, id).x, rect(moved, id).y])
  }
  expect((metaOf(rect(free, s.root)) as { layout: unknown }).layout).toBe('free')
})

it('the map does not drift after switching style or layout (no heal loop)', () => {
  const s = sample()
  const lines = setStyle(s.elements, s.mapId, 'lines').elements
  expect(layoutDrift(lines, s.mapId)).toBe(false)
  const boxes = setStyle(lines, s.mapId, 'boxes').elements
  expect(layoutDrift(boxes, s.mapId)).toBe(false)
  const right = setLayout(boxes, s.mapId, 'right').elements
  expect(layoutDrift(right, s.mapId)).toBe(false)
  const both = setLayout(right, s.mapId, 'both').elements
  expect(layoutDrift(both, s.mapId)).toBe(false)
})

it('switching back to boxes keeps deleted elements in the scene and marks old decorations deleted (undo keeps working)', () => {
  const s = sample()
  const erased = { ...rect(s.elements, s.a), id: 'erased-drawing', isDeleted: true, customData: undefined } as unknown as ExcalidrawElement
  const lines = setStyle([...s.elements, erased], s.mapId, 'lines').elements
  const decorations = live(lines).filter((e) => ['edge', 'underline', 'knob'].includes(metaOf(e)?.kind ?? '')).map((e) => e.id)
  const boxes = setStyle(lines, s.mapId, 'boxes').elements
  expect(boxes.find((e) => e.id === 'erased-drawing')?.isDeleted).toBe(true)
  for (const id of decorations) expect(boxes.find((e) => e.id === id)?.isDeleted).toBe(true)
})
