import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { MINDMAP_PALETTE } from './colors'
import { addChild, createMap, relayout } from './commands'
import { markManualColors } from './manualColor'
import { metaOf, type NodeMeta } from './model'
import { setStyle } from './switchStyle'

const rect = (els: readonly ExcalidrawElement[], id: string) => els.find((e) => e.id === id)!
const metaAt = (els: readonly ExcalidrawElement[], id: string) => metaOf(rect(els, id)) as NodeMeta
const paint = (els: readonly ExcalidrawElement[], id: string, colors: Partial<Pick<ExcalidrawElement, 'strokeColor' | 'backgroundColor'>>) =>
  els.map((e) => (e.id === id ? ({ ...e, ...colors } as ExcalidrawElement) : e))

function twoBranches() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  return { elements: r.elements, root, a, b, mapId: metaAt(r.elements, root).mapId }
}

it('leaves a scene untouched when every node still has the color Rabisco applied', () => {
  const { elements } = twoBranches()
  expect(markManualColors(elements)).toBe(elements)
})

it('a node painted by hand becomes manual and keeps its color through relayout', () => {
  const t = twoBranches()
  const marked = markManualColors(paint(t.elements, t.a, { strokeColor: '#ff00ff' }))
  expect(metaAt(marked, t.a).colorAuto).toBe(false)
  expect(metaAt(marked, t.b).colorAuto).toBe(true)
  const again = addChild(marked, t.root, 'C').elements
  expect(rect(again, t.a).strokeColor).toBe('#ff00ff')
})

it('a hand-picked background also makes the node manual', () => {
  const t = twoBranches()
  const marked = markManualColors(paint(t.elements, t.a, { backgroundColor: '#ffec99' }))
  expect(metaAt(marked, t.a).colorAuto).toBe(false)
  expect(rect(relayout(marked, t.mapId), t.a).backgroundColor).toBe('#ffec99')
})

it('a node whose branch color is about to change (a sibling branch was removed) is not taken as manual', () => {
  const t = twoBranches()
  // Removing A shifts B to the first palette color on the next relayout; until then B keeps the
  // color Rabisco applied, so it must stay automatic.
  const withoutA = t.elements.map((e) => (e.id === t.a ? ({ ...e, isDeleted: true } as ExcalidrawElement) : e))
  expect(markManualColors(withoutA)).toBe(withoutA)
  expect(rect(relayout(withoutA, t.mapId), t.b).strokeColor).toBe(MINDMAP_PALETTE[0])
})

it('undoing the color change (back to the applied color) makes the node automatic again', () => {
  const t = twoBranches()
  const applied = rect(t.elements, t.a).strokeColor
  const manual = markManualColors(paint(t.elements, t.a, { strokeColor: '#ff00ff' }))
  const undone = markManualColors(paint(manual, t.a, { strokeColor: applied }))
  expect(metaAt(undone, t.a).colorAuto).toBe(true)
})

it('does nothing in lines style, where nodes are transparent by design', () => {
  const t = twoBranches()
  const lines = setStyle(t.elements, t.mapId, 'lines').elements
  expect(markManualColors(lines)).toBe(lines)
})

it('a manual color survives a round trip to lines style and back', () => {
  const t = twoBranches()
  const manual = markManualColors(paint(t.elements, t.a, { strokeColor: '#ff00ff' }))
  const back = setStyle(setStyle(manual, t.mapId, 'lines').elements, t.mapId, 'boxes').elements
  expect(markManualColors(back)).toBe(back)
  expect(rect(back, t.a).strokeColor).toBe('#ff00ff')
  expect(rect(back, t.b).strokeColor).toBe(MINDMAP_PALETTE[1])
})

it('files saved before appliedColor existed are left alone until the next relayout', () => {
  const t = twoBranches()
  const legacy = t.elements.map((e) => {
    const meta = metaOf(e)
    if (meta?.kind !== 'node') return e
    const rest: Partial<NodeMeta> = { ...meta }
    delete rest.appliedColor
    return { ...e, customData: { rabisco: rest } } as ExcalidrawElement
  })
  const painted = paint(legacy, t.a, { strokeColor: '#ff00ff' })
  expect(markManualColors(painted)).toBe(painted)
})
