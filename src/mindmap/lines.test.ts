import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { addChild, branchElementIds, createMap, layoutDrift, relayout } from './commands'
import { createKnob, createLineEdge, createUnderline, lineSiblingGap } from './lines'
import { metaOf, readMaps } from './model'
import { node } from './testElements'

type El = ExcalidrawElement & { containerId?: string | null; textAlign?: string; strokeColor: string }

const live = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted) as El[]
const rect = (els: readonly ExcalidrawElement[], id: string) => els.find((e) => e.id === id)!
const kind = (els: readonly ExcalidrawElement[], k: string) => live(els).filter((e) => metaOf(e)?.kind === k)

const withStyle = (els: readonly ExcalidrawElement[], rootId: string, style: string, layout?: string): ExcalidrawElement[] =>
  els.map((e) => (e.id === rootId ? ({ ...e, customData: { rabisco: { ...metaOf(e), style, layout } } } as ExcalidrawElement) : e))

/** A real map (root → A, B; A → A1) laid out in lines style. */
function linesMap() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  r = addChild(r.elements, a, 'A1')
  const a1 = r.select!
  const mapId = metaOf(rect(r.elements, root))!.mapId
  const elements = relayout(withStyle(r.elements, root, 'lines'), mapId)
  return { elements, root, a, b, a1, mapId }
}

it('lineSiblingGap is 24 px', () => {
  expect(lineSiblingGap()).toBe(24)
})

it('createUnderline makes a locked line at the node base with the branch color and meta', () => {
  const n = { ...node('n', 'r', 0), x: 10, y: 20, width: 80, height: 30 } as ExcalidrawElement
  const u = createUnderline(n, '#1971c2', 'm1')
  expect(u.locked).toBe(true)
  expect(u.type).toBe('line')
  expect(u.strokeColor).toBe('#1971c2')
  expect(metaOf(u)).toEqual({ kind: 'underline', mapId: 'm1', nodeId: 'n' })
  expect(u.x).toBe(10)
  expect(u.y).toBe(50)
  expect(u.width).toBe(80)
  expect((u as unknown as { points: [number, number][] }).points).toEqual([
    [0, 0],
    [80, 0],
  ])
})

it('createKnob returns null without children and a hollow circle at the child-facing tip otherwise', () => {
  const n = { ...node('n', 'r', 0), x: 10, y: 20, width: 80, height: 30 } as ExcalidrawElement
  expect(createKnob(n, '#1971c2', 'm1', 'right', false)).toBeNull()
  const k = createKnob(n, '#1971c2', 'm1', 'right', true)!
  expect(k.locked).toBe(true)
  expect(k.type).toBe('ellipse')
  expect(k.strokeColor).toBe('#1971c2')
  expect(k.backgroundColor).toBe('transparent')
  expect(metaOf(k)).toEqual({ kind: 'knob', mapId: 'm1', nodeId: 'n' })
  expect(k.x + k.width / 2).toBeCloseTo(90, 5)
  expect(k.y + k.height / 2).toBeCloseTo(50, 5)
  const left = createKnob(n, '#1971c2', 'm1', 'left', true)!
  expect(left.x + left.width / 2).toBeCloseTo(10, 5)
})

it('createLineEdge draws a locked 4-point rounded curve without any binding', () => {
  const parent = { ...node('p', null), x: 0, y: 0, width: 100, height: 40 } as ExcalidrawElement
  const child = { ...node('c', 'p', 0), x: 200, y: 40, width: 80, height: 30 } as ExcalidrawElement
  const edge = createLineEdge('m1', parent, child, '#e8590c')
  expect(edge.type).toBe('line')
  expect(edge.locked).toBe(true)
  expect(edge.strokeColor).toBe('#e8590c')
  expect(edge.roundness).toBeTruthy()
  expect(metaOf(edge)).toEqual({ kind: 'edge', mapId: 'm1', childId: 'c' })
  const e = edge as unknown as { points: [number, number][]; startBinding: unknown; endBinding: unknown }
  expect(e.points).toHaveLength(4)
  expect(e.points[0]).toEqual([0, 0])
  expect(e.points[1][1]).toBe(e.points[0][1])
  expect(e.points[3][1]).toBe(e.points[2][1])
  expect(e.startBinding).toBeNull()
  expect(e.endBinding).toBeNull()
})

it('relayout in lines style creates underlines, knobs and curved links without duplication', () => {
  const m = linesMap()
  expect(kind(m.elements, 'underline')).toHaveLength(3)
  expect(kind(m.elements, 'knob')).toHaveLength(1)
  expect(kind(m.elements, 'edge')).toHaveLength(3)
  const knob = kind(m.elements, 'knob')[0]
  expect((metaOf(knob) as { nodeId: string }).nodeId).toBe(m.a)
  const again = relayout(m.elements, m.mapId)
  expect(kind(again, 'underline')).toHaveLength(3)
  expect(kind(again, 'knob')).toHaveLength(1)
  expect(kind(again, 'edge')).toHaveLength(3)
})

it('relayout in lines style makes nodes transparent with left-aligned text', () => {
  const m = linesMap()
  const a = rect(m.elements, m.a)
  expect(a.strokeColor).toBe('transparent')
  expect(a.backgroundColor).toBe('transparent')
  const text = live(m.elements).find((e) => e.containerId === m.a)!
  expect(text.textAlign).toBe('left')
})

it('lines style leaves 24px between stacked siblings', () => {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  r = addChild(r.elements, root, 'C')
  const c = r.select!
  const mapId = metaOf(rect(r.elements, root))!.mapId
  const els = relayout(withStyle(r.elements, root, 'lines', 'right'), mapId)
  const ra = rect(els, a)
  const rb = rect(els, b)
  const rc = rect(els, c)
  expect(rb.y - ra.y - ra.height).toBeCloseTo(24, 5)
  expect(rc.y - rb.y - rb.height).toBeCloseTo(24, 5)
})

it('branchElementIds includes the underline, knob and link of a lines-style branch', () => {
  const m = linesMap()
  const ids = new Set(branchElementIds(m.elements, m.a))
  for (const e of kind(m.elements, 'underline')) {
    if ([m.a, m.a1].includes((metaOf(e) as { nodeId: string }).nodeId)) expect(ids.has(e.id)).toBe(true)
  }
  for (const e of kind(m.elements, 'edge')) {
    if ([m.a, m.a1].includes((metaOf(e) as { childId: string }).childId)) expect(ids.has(e.id)).toBe(true)
  }
  expect(ids.has(kind(m.elements, 'knob')[0].id)).toBe(true)
  expect(readMaps(m.elements).get(m.mapId)).toBeDefined()
})

it.each(['both', 'right'])('a lines-style map laid out in %s does not drift right after relayout (no heal loop)', (layout) => {
  const { elements, root, mapId } = linesMap()
  const laidOut = relayout(withStyle(elements, root, 'lines', layout), mapId)
  expect(layoutDrift(laidOut, mapId)).toBe(false)
})

it('draws underlines, knobs and links with clean (not hand-drawn) strokes', () => {
  const { elements } = linesMap()
  for (const k of ['underline', 'knob', 'edge']) {
    expect(kind(elements, k).length).toBeGreaterThan(0)
    for (const e of kind(elements, k)) expect(e.roughness).toBe(0)
  }
})
