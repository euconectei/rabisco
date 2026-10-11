import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { parseScene, serializeScene } from '../editor/scene'
import { MINDMAP_PALETTE, ROOT_COLOR } from './colors'
import { collapse } from './collapse'
import { addChild, addSibling, branchElementIds, createMap, findNodeOf, freeChildPosition, isLinkOf, layoutDrift, navigate, relayout } from './commands'
import { metaOf, readMaps } from './model'
import { setStyle } from './switchStyle'
import { edge, knob, node, underline } from './testElements'

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

const withLayout = (els: readonly ExcalidrawElement[], rootId: string, layout: string): ExcalidrawElement[] =>
  els.map((e) => (e.id === rootId ? ({ ...e, customData: { rabisco: { ...metaOf(e), layout } } } as ExcalidrawElement) : e))

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

it('ignores copied links that still carry the original metadata (Ctrl+D, copy/paste)', () => {
  const t = threeChildren()
  const original = live(t.elements).find((e) => metaOf(e)?.kind === 'edge' && (metaOf(e) as { childId: string }).childId === t.a)!
  // A duplicate keeps customData but Excalidraw binds it to the duplicated nodes.
  const copy = {
    ...original,
    id: 'copied-edge',
    x: original.x + 1000,
    y: original.y + 1000,
    endBinding: { elementId: 'copied-node', focus: 0, gap: 1 },
    startBinding: { elementId: 'copied-root', focus: 0, gap: 1 },
  } as unknown as ExcalidrawElement
  const elements = [...t.elements, copy]
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const after = relayout(elements, mapId)
  // The duplicate loses its Rabisco metadata and becomes a plain arrow.
  expect(metaOf(after.find((e) => e.id === 'copied-edge')!)).toBeNull()
  expect(branchElementIds(elements, t.a)).not.toContain('copied-edge')
})

it('detects when a map drifted from its layout (e.g. after an undo)', () => {
  const t = threeChildren()
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  expect(layoutDrift(t.elements, mapId)).toBe(false)
  const moved = t.elements.map((e) => (e.id === t.b ? ({ ...e, y: e.y + 37 } as ExcalidrawElement) : e))
  expect(layoutDrift(moved, mapId)).toBe(true)
})

it('detects when a collapsed node\'s own badge drifted from its place', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const collapsed = collapse(r.elements, t.a).elements
  const mapId = metaOf(rect(collapsed, t.root))!.mapId
  expect(layoutDrift(collapsed, mapId)).toBe(false)
  const badgeId = (metaOf(rect(collapsed, t.a)) as { badgeId?: string }).badgeId!
  const moved = collapsed.map((e) => (e.id === badgeId ? ({ ...e, y: e.y + 40 } as ExcalidrawElement) : e))
  expect(layoutDrift(moved, mapId)).toBe(true)
})

it('healing a drifted badge is stable: a second relayout moves nothing', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const collapsed = collapse(r.elements, t.a).elements
  const mapId = metaOf(rect(collapsed, t.root))!.mapId
  const badgeId = (metaOf(rect(collapsed, t.a)) as { badgeId?: string }).badgeId!
  const before = rect(collapsed, badgeId)
  const moved = collapsed.map((e) => (e.id === badgeId ? ({ ...e, y: e.y + 40 } as ExcalidrawElement) : e))
  const healed = relayout(moved, mapId)
  expect(rect(healed, badgeId).y).toBe(before.y)
  expect(layoutDrift(healed, mapId)).toBe(false)
  const again = relayout(healed, mapId)
  const at = (els: readonly ExcalidrawElement[], id: string) => {
    const e = els.find((x) => x.id === id)!
    return [e.x, e.y, e.width, e.height]
  }
  for (const e of healed) expect(at(again, e.id)).toEqual(at(healed, e.id))
})

it('detects and restores a drifted badge in lines style too', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const mapId = metaOf(rect(r.elements, t.root))!.mapId
  const lines = setStyle(r.elements, mapId, 'lines').elements
  const collapsed = collapse(lines, t.a).elements
  expect(layoutDrift(collapsed, mapId)).toBe(false)
  const badgeId = (metaOf(rect(collapsed, t.a)) as { badgeId?: string }).badgeId!
  const before = rect(collapsed, badgeId)
  const moved = collapsed.map((e) => (e.id === badgeId ? ({ ...e, y: e.y + 40 } as ExcalidrawElement) : e))
  expect(layoutDrift(moved, mapId)).toBe(true)
  const healed = relayout(moved, mapId)
  expect(rect(healed, badgeId).y).toBe(before.y)
})

it('isLinkOf: lines style trusts customData, boxes style requires endBinding', () => {
  const childIds = new Set(['child'])
  expect(isLinkOf(edge('e1', 'child'), childIds, 'lines')).toBe('child')
  expect(isLinkOf(edge('e1', 'child'), childIds, 'boxes')).toBeNull()
  const bound = edge('e2', 'child', { endBinding: { elementId: 'child', focus: 0, gap: 1 } })
  expect(isLinkOf(bound, childIds, 'boxes')).toBe('child')
  // A copied link: same customData, but bound to another node.
  const copied = edge('e3', 'child', { endBinding: { elementId: 'other', focus: 0, gap: 1 } })
  expect(isLinkOf(copied, childIds, 'boxes')).toBeNull()
  expect(isLinkOf(copied, childIds, 'lines')).toBe('child')
})

it('duplicate link: the first wins, the second loses its Rabisco metadata', () => {
  const t = threeChildren()
  const original = live(t.elements).find((e) => metaOf(e)?.kind === 'edge' && (metaOf(e) as { childId: string }).childId === t.a)!
  const dup = { ...original, id: 'dup-edge' } as unknown as ExcalidrawElement
  const elements = [...t.elements, dup]
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const after = relayout(elements, mapId)
  expect(metaOf(after.find((e) => e.id === 'dup-edge')!)).toBeNull()
  expect(branchElementIds(elements, t.a)).not.toContain('dup-edge')
})

it('duplicate decoration: the first wins, the second is ignored by relayout and branchElementIds', () => {
  const t = threeChildren()
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const elements = [...t.elements, underline('u1', t.a, mapId), underline('u2', t.a, mapId), knob('k1', t.a, mapId)]
  const after = relayout(elements, mapId)
  expect(metaOf(after.find((e) => e.id === 'u1')!)).toMatchObject({ kind: 'underline' })
  expect(metaOf(after.find((e) => e.id === 'u2')!)).toBeNull()
  expect(metaOf(after.find((e) => e.id === 'k1')!)).toMatchObject({ kind: 'knob' })
  const ids = new Set(branchElementIds(elements, t.a))
  expect(ids.has('u1')).toBe(true)
  expect(ids.has('k1')).toBe(true)
  expect(ids.has('u2')).toBe(false)
})

it('a new map is born explicit: both sides, boxes style', () => {
  const { elements, select } = createMap([], { x: 0, y: 0 }, 'Raiz')
  const rabisco = metaOf(rect(elements, select!)) as { layout?: unknown; style?: unknown }
  expect(rabisco.layout).toBe('both')
  expect(rabisco.style).toBe('boxes')
})

it('right layout: relayout puts every first-level branch to the right and keeps its side', () => {
  const t = threeChildren()
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const after = relayout(withLayout(t.elements, t.root, 'right'), mapId)
  const rootX = rect(after, t.root).x
  for (const id of [t.a, t.b, t.c]) expect(rect(after, id).x).toBeGreaterThan(rootX)
  expect(noOverlap(after)).toBe(true)
  expect((metaOf(rect(after, t.a)) as { side: unknown }).side).toBe('right')
  expect((metaOf(rect(after, t.b)) as { side: unknown }).side).toBe('left')
})

it('switching right → both returns each first-level branch to its original side', () => {
  const t = threeChildren()
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const right = relayout(withLayout(t.elements, t.root, 'right'), mapId)
  expect((metaOf(rect(right, t.b)) as { side: unknown }).side).toBe('left')
  const both = relayout(withLayout(t.elements, t.root, 'both'), mapId)
  expect([t.a, t.b, t.c].map((id) => (metaOf(rect(both, id)) as { side: unknown }).side)).toEqual(['right', 'left', 'right'])
})

it('right layout: layoutDrift detects a manual move and relayout restores it', () => {
  const t = threeChildren()
  const mapId = metaOf(rect(t.elements, t.root))!.mapId
  const right = relayout(withLayout(t.elements, t.root, 'right'), mapId)
  expect(layoutDrift(right, mapId)).toBe(false)
  const moved = right.map((e) => (e.id === t.b ? ({ ...e, y: e.y + 37 } as ExcalidrawElement) : e))
  expect(layoutDrift(moved, mapId)).toBe(true)
  const restored = relayout(moved, mapId)
  expect(rect(restored, t.b).y).toBe(rect(right, t.b).y)
})

it('right layout: navigate goes to the first child and back to the parent', () => {
  const t = threeChildren()
  const r = addChild(t.elements, t.a, 'A1')
  const a1 = r.select!
  const right = withLayout(r.elements, t.root, 'right')
  expect(navigate(right, t.root, 'ArrowRight')).toBe(t.a)
  expect(navigate(right, t.a, 'ArrowRight')).toBe(a1)
  expect(navigate(right, a1, 'ArrowLeft')).toBe(t.a)
  expect(navigate(right, t.a, 'ArrowLeft')).toBe(t.root)
  expect(navigate(right, t.root, 'ArrowLeft')).toBeNull()
})

describe('free layout', () => {
  function freeMap() {
    const r = createMap([], { x: 0, y: 0 }, 'Raiz')
    return { elements: withLayout(r.elements, r.select!, 'free'), root: r.select! }
  }

  it('relayout keeps every node where it is and reports no drift', () => {
    const m = freeMap()
    const first = addChild(m.elements, m.root, 'A')
    const a = first.select!
    const second = addChild(first.elements, m.root, 'B')
    const b = second.select!
    const mapId = metaOf(rect(second.elements, m.root))!.mapId
    const moved = second.elements.map((e) => (e.id === a ? ({ ...e, x: e.x + 111, y: e.y + 7 } as ExcalidrawElement) : e))
    expect(layoutDrift(moved, mapId)).toBe(false)
    const after = relayout(moved, mapId)
    for (const id of [m.root, a, b]) {
      expect([rect(after, id).x, rect(after, id).y]).toEqual([rect(moved, id).x, rect(moved, id).y])
    }
  })

  it('a new child goes beside the parent, below the last sibling', () => {
    const m = freeMap()
    const first = addChild(m.elements, m.root, 'A')
    const a = first.select!
    const second = addChild(first.elements, m.root, 'B')
    const b = second.select!
    const root = rect(second.elements, m.root)
    const aRect = rect(second.elements, a)
    const bRect = rect(second.elements, b)
    expect(aRect.x).toBeGreaterThan(root.x + root.width)
    expect(bRect.x).toBeGreaterThan(root.x + root.width)
    expect(bRect.y).toBeGreaterThan(aRect.y + aRect.height)
  })

  it('freeChildPosition descends past an obstacle so the child never overlaps', () => {
    const root = { ...node('r', null), x: 0, y: 0, width: 180, height: 56 } as ExcalidrawElement
    const a = { ...node('a', 'r', 0), x: 260, y: 0, width: 140, height: 44 } as ExcalidrawElement
    const obstacle = { ...node('obs', 'a', 0), x: 260, y: 60, width: 140, height: 44 } as ExcalidrawElement
    const elements = [root, a, obstacle]
    const map = readMaps(elements).get('m1')!
    const position = freeChildPosition(elements, map, 'r', null)
    const child = { x: position.x, y: position.y, width: 140, height: 44 }
    expect(child.x).toBeGreaterThan(root.x + root.width)
    for (const e of elements) {
      const overlap = child.x < e.x + e.width && e.x < child.x + child.width && child.y < e.y + e.height && e.y < child.y + child.height
      expect(overlap).toBe(false)
    }
  })

  it('freeChildPosition honors the branch side for maps that came from both sides', () => {
    const root = { ...node('r', null), x: 0, y: 0, width: 180, height: 56 } as ExcalidrawElement
    const map = readMaps([root]).get('m1')!
    const right = freeChildPosition([root], map, 'r', 'right')
    const left = freeChildPosition([root], map, 'r', 'left')
    expect(right.x).toBeGreaterThan(root.x + root.width)
    expect(left.x).toBeLessThan(root.x)
  })

  it('navigate in free goes to the first child and back to the parent', () => {
    const m = freeMap()
    const first = addChild(m.elements, m.root, 'A')
    const a = first.select!
    const second = addChild(first.elements, a, 'A1')
    const a1 = second.select!
    expect(navigate(second.elements, m.root, 'ArrowRight')).toBe(a)
    expect(navigate(second.elements, a, 'ArrowRight')).toBe(a1)
    expect(navigate(second.elements, a1, 'ArrowLeft')).toBe(a)
    expect(navigate(second.elements, a, 'ArrowLeft')).toBe(m.root)
    expect(navigate(second.elements, m.root, 'ArrowLeft')).toBeNull()
  })
})
