import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { parseScene, serializeScene } from '../editor/scene'
import { MINDMAP_PALETTE, ROOT_COLOR } from './colors'
import { addChild, addSibling, branchElementIds, createMap, findNodeOf, navigate, relayout } from './commands'
import { metaOf, readMaps } from './model'

type El = ExcalidrawElement & { text?: string; containerId?: string | null; strokeColor: string }

const live = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted) as El[]
const textOf = (els: readonly ExcalidrawElement[], id: string) => live(els).find((e) => e.containerId === id)?.text
const rect = (els: readonly ExcalidrawElement[], id: string) => els.find((e) => e.id === id)!
function noOverlap(els: readonly ExcalidrawElement[]) {
  const boxes = live(els).filter((e) => metaOf(e)?.kind === 'node')
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) return false
    }
  return true
}

function threeChildren() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  r = addChild(r.elements, root, 'C')
  const c = r.select!
  return { elements: r.elements, root, a, b, c }
}

it('createMap makes a readable root and selects it', () => {
  const { elements, select } = createMap([], { x: 100, y: 100 }, 'Raiz')
  const map = [...readMaps(elements).values()][0]
  expect(map.root.id).toBe(select)
  expect(textOf(elements, select!)).toBe('Raiz')
  expect(rect(elements, select!).strokeColor).toBe(ROOT_COLOR)
})

it('Tab three times: ordered children on both sides, without overlap, with branch colors', () => {
  const { elements, root, a, b, c } = threeChildren()
  const map = readMaps(elements).values().next().value!
  expect(map.root.children.map((n) => n.id)).toEqual([a, b, c])
  const rootX = rect(elements, root).x
  expect(rect(elements, a).x).toBeGreaterThan(rootX)
  expect(rect(elements, b).x).toBeLessThan(rootX)
  expect(noOverlap(elements)).toBe(true)
  expect([a, b, c].map((id) => rect(elements, id).strokeColor)).toEqual([MINDMAP_PALETTE[0], MINDMAP_PALETTE[1], MINDMAP_PALETTE[2]])
  const edges = live(elements).filter((e) => metaOf(e)?.kind === 'edge')
  expect(edges).toHaveLength(3)
  // Each link is bound both ways, so dragging a node in Excalidraw drags its links.
  for (const edge of edges) {
    const { startBinding, endBinding } = edge as unknown as { startBinding: { elementId: string }; endBinding: { elementId: string } }
    expect(rect(elements, startBinding.elementId).boundElements?.some((b) => b.id === edge.id)).toBe(true)
    expect(rect(elements, endBinding.elementId).boundElements?.some((b) => b.id === edge.id)).toBe(true)
  }
})

it('addSibling inserts right after the node and shifts the following ones', () => {
  const { elements, root, a, b } = threeChildren()
  const r = addSibling(elements, a, 'A2')
  const map = readMaps(r.elements).values().next().value!
  expect(map.root.children.map((n) => n.id).slice(0, 3)).toEqual([a, r.select, b])
  expect(addSibling(elements, root, 'X').elements.length).toBeGreaterThan(elements.length)
})

it('lists every element of a branch (nodes, their texts and links) for Excalidraw to delete', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const a1 = r.select!
  const ids = new Set(branchElementIds(r.elements, t.a))
  const expected = live(r.elements).filter((e) => {
    const meta = metaOf(e)
    return [t.a, a1].includes(e.id) || [t.a, a1].includes(e.containerId ?? '') || (meta?.kind === 'edge' && [t.a, a1].includes(meta.childId))
  })
  expect([...ids].sort()).toEqual(expected.map((e) => e.id).sort())
  expect(ids.has(t.root)).toBe(false)
  expect(ids.has(t.b)).toBe(false)
  // The root's branch is the whole map.
  expect(branchElementIds(r.elements, t.root)).toHaveLength(live(r.elements).length)
})

it('navigates by side, siblings and edges', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const els = r.elements
  expect(navigate(els, t.root, 'ArrowRight')).toBe(t.a)
  expect(navigate(els, t.root, 'ArrowLeft')).toBe(t.b)
  expect(navigate(els, t.a, 'ArrowRight')).toBe(r.select)
  expect(navigate(els, t.a, 'ArrowLeft')).toBe(t.root)
  expect(navigate(els, t.b, 'ArrowRight')).toBe(t.root)
  expect(navigate(els, t.a, 'ArrowDown')).toBe(t.c)
  expect(navigate(els, t.c, 'ArrowUp')).toBe(t.a)
  expect(navigate(els, t.c, 'ArrowDown')).toBeNull()
})

it('two maps never touch each other, and free elements keep their identity', () => {
  const one = createMap([], { x: 0, y: 0 }, 'Um')
  const two = createMap(one.elements, { x: 2000, y: 2000 }, 'Dois')
  const free = { id: 'free', type: 'ellipse', x: 1, y: 1, width: 5, height: 5, isDeleted: false } as unknown as ExcalidrawElement
  const before = [...two.elements, free]
  const after = addChild(before, one.select!, 'Filho').elements
  for (const element of before) {
    const meta = metaOf(element)
    if (element.id === 'free' || (meta && meta.mapId !== metaOf(rect(before, one.select!))!.mapId)) {
      expect(after.find((e) => e.id === element.id)).toBe(element)
    }
  }
})

it('keeps manual colors through relayout', () => {
  const t = threeChildren()
  const manual = t.elements.map((e) =>
    e.id === t.a ? ({ ...e, strokeColor: '#ff00ff', customData: { rabisco: { ...metaOf(e), colorAuto: false } } } as ExcalidrawElement) : e,
  )
  const mapId = metaOf(rect(manual, t.root))!.mapId
  expect(rect(relayout(manual, mapId), t.a).strokeColor).toBe('#ff00ff')
})

it('finds the selected node, also when its text is selected, and only for a single node', () => {
  const t = threeChildren()
  const textId = live(t.elements).find((e) => e.containerId === t.a)!.id
  expect(findNodeOf(t.elements, [t.a])?.nodeId).toBe(t.a)
  expect(findNodeOf(t.elements, [t.a, textId])?.nodeId).toBe(t.a)
  expect(findNodeOf(t.elements, [t.a, t.b])).toBeNull()
  expect(findNodeOf(t.elements, [])).toBeNull()
})

it('survives a save and reload: the file holds the same map', () => {
  const t = threeChildren()
  const reloaded = parseScene(serializeScene({ elements: t.elements, appState: {}, files: {} })).elements
  const map = readMaps(reloaded).values().next().value!
  expect(map.root.children.map((n) => n.id)).toEqual([t.a, t.b, t.c])
  expect(textOf(reloaded, t.b)).toBe('B')
})
