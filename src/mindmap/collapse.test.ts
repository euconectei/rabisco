import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { parseScene, serializeScene } from '../editor/scene'
import { badgeOf, collapse, expand, toggleCollapse } from './collapse'
import { addChild, branchElementIds, createMap, relayout } from './commands'
import { metaOf, readMaps, type NodeMeta } from './model'
import { edge, knob, node, underline } from './testElements'

type El = ExcalidrawElement & { text?: string; containerId?: string | null }

const live = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted) as El[]
const textOf = (els: readonly ExcalidrawElement[], id: string) => live(els).find((e) => e.containerId === id)?.text
const nodeMeta = (els: readonly ExcalidrawElement[], id: string) => metaOf(els.find((e) => e.id === id)!) as NodeMeta
const kinds = (els: readonly ExcalidrawElement[]) => {
  const l = live(els)
  return {
    nodes: l.filter((e) => metaOf(e)?.kind === 'node').length,
    texts: l.filter((e) => e.type === 'text' && e.containerId).length,
    edges: l.filter((e) => metaOf(e)?.kind === 'edge').length,
  }
}

/** Raiz → A (A1, A2 → A2x), B */
function sample() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, a, 'A1')
  const a1 = r.select!
  r = addChild(r.elements, a, 'A2')
  const a2 = r.select!
  r = addChild(r.elements, a2, 'A2x')
  const a2x = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  return { elements: r.elements, root, a, a1, a2, a2x, b }
}

it('collapsing a node with 2 children and 1 grandchild hides 3 nodes, 3 texts and 3 links, with a "+3" badge', () => {
  const s = sample()
  const before = kinds(s.elements)
  const { elements, select } = collapse(s.elements, s.a)
  const after = kinds(elements)
  expect(before.nodes - after.nodes).toBe(3)
  expect(before.texts - after.texts).toBe(3)
  expect(before.edges - after.edges).toBe(3)
  expect(select).toBe(s.a)
  expect(nodeMeta(elements, s.a).collapsed).toBe(true)
  expect(nodeMeta(elements, s.a).hidden).toHaveLength(9)
  expect((badgeOf(elements, s.a) as El | undefined)?.text).toBe('+3')
  // The other branch is untouched.
  expect(textOf(elements, s.b)).toBe('B')
  expect([...readMaps(elements).values()][0].byId.has(s.b)).toBe(true)
})

it('the collapsed node becomes a leaf of the map', () => {
  const s = sample()
  const { elements } = collapse(s.elements, s.a)
  const map = [...readMaps(elements).values()][0]
  expect(map.byId.get(s.a)!.children).toEqual([])
  expect(map.byId.has(s.a1)).toBe(false)
})

it('expanding brings back the same ids, texts and colors, and removes the badge', () => {
  const s = sample()
  const colors = new Map(live(s.elements).map((e) => [e.id, e.strokeColor]))
  const collapsed = collapse(s.elements, s.a).elements
  const { elements, select } = expand(collapsed, s.a)
  expect(select).toBe(s.a)
  for (const [id, text] of [[s.a1, 'A1'], [s.a2, 'A2'], [s.a2x, 'A2x']]) {
    expect(textOf(elements, id)).toBe(text)
    expect(live(elements).find((e) => e.id === id)!.strokeColor).toBe(colors.get(id))
  }
  expect(kinds(elements)).toEqual(kinds(s.elements))
  expect(badgeOf(elements, s.a)).toBeUndefined()
  expect(nodeMeta(elements, s.a).collapsed).toBeFalsy()
  expect(nodeMeta(elements, s.a).hidden).toBeUndefined()
  // Restored elements outrank their deleted versions (Excalidraw reconciles by version).
  const restored = live(elements).find((e) => e.id === s.a1)!
  const deleted = collapsed.find((e) => e.id === s.a1)!
  expect(restored.version).toBeGreaterThan(deleted.version)
})

it('collapse → save → reopen → expand restores the whole branch', () => {
  const s = sample()
  const collapsed = collapse(s.elements, s.a).elements
  const reopened = parseScene(serializeScene({ elements: collapsed, appState: {}, files: {} })).elements
  expect(reopened.some((e) => e.id === s.a1)).toBe(false) // deleted elements are not saved
  const { elements } = expand(reopened, s.a)
  expect(textOf(elements, s.a2x)).toBe('A2x')
  expect(kinds(elements)).toEqual(kinds(s.elements))
  expect([...readMaps(elements).values()][0].byId.get(s.a2)!.children.map((c) => c.id)).toEqual([s.a2x])
})

it('a node collapsed inside a collapsed branch stays collapsed when the parent is expanded', () => {
  const s = sample()
  let elements = collapse(s.elements, s.a2).elements
  elements = collapse(elements, s.a).elements
  elements = expand(elements, s.a).elements
  expect(nodeMeta(elements, s.a2).collapsed).toBe(true)
  expect(live(elements).some((e) => e.id === s.a2x)).toBe(false)
  expect((badgeOf(elements, s.a2) as El | undefined)?.text).toBe('+1')
  elements = expand(elements, s.a2).elements
  expect(textOf(elements, s.a2x)).toBe('A2x')
})

it('the badge counts nodes hidden at any depth', () => {
  const s = sample()
  let elements = collapse(s.elements, s.a2).elements
  elements = collapse(elements, s.a).elements
  expect((badgeOf(elements, s.a) as El | undefined)?.text).toBe('+3')
})

it('toggleCollapse switches, and does nothing on a node without children', () => {
  const s = sample()
  const once = toggleCollapse(s.elements, s.a).elements
  expect(nodeMeta(once, s.a).collapsed).toBe(true)
  const twice = toggleCollapse(once, s.a).elements
  expect(nodeMeta(twice, s.a).collapsed).toBeFalsy()
  const leaf = toggleCollapse(s.elements, s.b)
  expect(leaf.elements).toEqual(s.elements)
})

it('deleting a collapsed node leaves no orphan elements behind (its badge goes with it)', () => {
  const s = sample()
  const collapsed = collapse(s.elements, s.a).elements
  const ids = new Set(branchElementIds(collapsed, s.a))
  expect(ids.has(badgeOf(collapsed, s.a)!.id)).toBe(true)
  const remaining = live(collapsed).filter((e) => !ids.has(e.id))
  const remainingIds = new Set(remaining.map((e) => e.id))
  for (const e of remaining) {
    if (e.containerId) expect(remainingIds.has(e.containerId)).toBe(true)
  }
  expect(remaining.some((e) => (e.customData as { rabisco?: { nodeId?: string } } | undefined)?.rabisco?.nodeId === s.a)).toBe(false)
})

describe('copies of a collapsed node (Ctrl+D, copy/paste keep customData with the original ids)', () => {
  function withCopy() {
    const s = sample()
    const collapsed = collapse(s.elements, s.a).elements
    const badge = badgeOf(collapsed, s.a)!
    // What Excalidraw pastes: new ids, same customData, a little offset.
    const copies = collapsed
      .filter((e) => !e.isDeleted && (e.id === s.a || (e as El).containerId === s.a || e.id === badge.id))
      .map((e) => ({ ...e, id: `copy-${e.id}`, x: e.x + 500, y: e.y + 500, containerId: (e as El).containerId ? `copy-${s.a}` : undefined }) as unknown as ExcalidrawElement)
    return { s, elements: [...collapsed, ...copies], copyBadgeId: `copy-${badge.id}` }
  }

  it('a copied badge is a plain text: relayout leaves it where it is', () => {
    const { s, elements, copyBadgeId } = withCopy()
    const before = elements.find((e) => e.id === copyBadgeId)!
    const after = relayout(elements, nodeMeta(elements, s.root).mapId).find((e) => e.id === copyBadgeId)!
    expect([after.x, after.y]).toEqual([before.x, before.y])
  })

  it('expanding the original leaves no live badge of that node behind', () => {
    const { s, elements, copyBadgeId } = withCopy()
    const expanded = expand(elements, s.a).elements
    expect(live(expanded).filter((e) => metaOf(e)?.kind === 'badge' && e.id !== copyBadgeId)).toHaveLength(0)
    expect(badgeOf(expanded, s.a)).toBeUndefined()
  })

  it('deleting the original branch does not take the copied badge', () => {
    const { s, elements, copyBadgeId } = withCopy()
    expect(branchElementIds(elements, s.a)).not.toContain(copyBadgeId)
  })
})

describe('free layout', () => {
  const withLayout = (els: readonly ExcalidrawElement[], rootId: string, layout: string): ExcalidrawElement[] =>
    els.map((e) => (e.id === rootId ? ({ ...e, customData: { rabisco: { ...metaOf(e), layout } } } as ExcalidrawElement) : e))

  it('collapse → expand restores each node to its exact position', () => {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    const root = r.select!
    r = addChild(withLayout(r.elements, root, 'free'), root, 'A')
    const a = r.select!
    r = addChild(r.elements, a, 'A1')
    const a1 = r.select!
    // Move the branch by hand: in free layout nothing snaps it back.
    const moved = r.elements.map((e) =>
      e.id === a ? ({ ...e, x: e.x + 40, y: e.y + 25 } as ExcalidrawElement) : e.id === a1 ? ({ ...e, x: e.x - 10, y: e.y + 60 } as ExcalidrawElement) : e,
    )
    const positions = new Map(live(moved).filter((e) => metaOf(e)?.kind === 'node').map((e) => [e.id, { x: e.x, y: e.y }]))
    const collapsed = collapse(moved, a).elements
    const expanded = expand(collapsed, a).elements
    for (const [id, p] of positions) {
      const e = live(expanded).find((e) => e.id === id)!
      expect([e.x, e.y]).toEqual([p.x, p.y])
    }
  })
})

describe('hand-drawn arrows bound to a hidden descendant', () => {
  const handArrow = (id: string, start: string | null, end: string | null): ExcalidrawElement =>
    ({
      id,
      type: 'arrow',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      isDeleted: false,
      startBinding: start ? { elementId: start, focus: 0, gap: 1 } : null,
      endBinding: end ? { elementId: end, focus: 0, gap: 1 } : null,
    }) as unknown as ExcalidrawElement

  const handText = (id: string, arrowId: string): ExcalidrawElement =>
    ({ id, type: 'text', x: 0, y: 0, width: 10, height: 10, isDeleted: false, containerId: arrowId, text: 'note' }) as unknown as ExcalidrawElement

  it('is hidden and restored with the same ids and bindings', () => {
    const s = sample()
    const arrow = handArrow('free-arrow', s.b, s.a1)
    const collapsed = collapse([...s.elements, arrow], s.a).elements
    const hidden = nodeMeta(collapsed, s.a).hidden ?? []
    expect(hidden.some((e) => e.id === 'free-arrow')).toBe(true)
    expect(live(collapsed).some((e) => e.id === 'free-arrow')).toBe(false)
    const expanded = expand(collapsed, s.a).elements
    const restored = live(expanded).find((e) => e.id === 'free-arrow')!
    expect(restored).toBeTruthy()
    const binding = restored as unknown as { startBinding?: { elementId?: string } | null; endBinding?: { elementId?: string } | null }
    expect(binding.startBinding?.elementId).toBe(s.b)
    expect(binding.endBinding?.elementId).toBe(s.a1)
  })

  it('an arrow bound only to the collapsed node stays visible', () => {
    const s = sample()
    const arrow = handArrow('free-arrow', s.a, null)
    const collapsed = collapse([...s.elements, arrow], s.a).elements
    expect(live(collapsed).some((e) => e.id === 'free-arrow')).toBe(true)
    expect(nodeMeta(collapsed, s.a).hidden?.some((e) => e.id === 'free-arrow')).toBe(false)
  })

  it('its bound text is hidden and restored with it', () => {
    const s = sample()
    const arrow = handArrow('free-arrow', s.b, s.a2x)
    const text = handText('free-text', 'free-arrow')
    const collapsed = collapse([...s.elements, arrow, text], s.a).elements
    const hidden = nodeMeta(collapsed, s.a).hidden ?? []
    expect(hidden.some((e) => e.id === 'free-text')).toBe(true)
    expect(live(collapsed).some((e) => e.id === 'free-text')).toBe(false)
    const expanded = expand(collapsed, s.a).elements
    expect(live(expanded).some((e) => e.id === 'free-text')).toBe(true)
  })

  it('does not change the badge count', () => {
    const s = sample()
    const arrow = handArrow('free-arrow', s.b, s.a1)
    const collapsed = collapse([...s.elements, arrow], s.a).elements
    expect((badgeOf(collapsed, s.a) as El | undefined)?.text).toBe('+3')
  })
})

describe('lines-style branch decorations', () => {
  /** r(lines) → a → a1, with a line link to each child and an underline + knob on a1. */
  function linesMap() {
    const r = node('r', null, 0, { style: 'lines' })
    const a = node('a', 'r', 0)
    const a1 = node('a1', 'a', 0)
    const linkA = edge('la', 'a')
    const linkA1 = edge('la1', 'a1')
    const ua1 = underline('ua1', 'a1')
    const ka1 = knob('ka1', 'a1')
    return { elements: [r, a, a1, linkA, linkA1, ua1, ka1], a: 'a', a1: 'a1' }
  }

  it('branchElementIds includes the branch line link and decorations, not the root', () => {
    const { elements, a } = linesMap()
    const ids = new Set(branchElementIds(elements, a))
    expect(ids.has('la')).toBe(true)
    expect(ids.has('la1')).toBe(true)
    expect(ids.has('ua1')).toBe(true)
    expect(ids.has('ka1')).toBe(true)
    expect(ids.has('r')).toBe(false)
  })

  it('collapse hides and expand restores the branch decorations', () => {
    const { elements, a } = linesMap()
    const collapsed = collapse(elements, a).elements
    const hidden = nodeMeta(collapsed, a).hidden ?? []
    expect(hidden.some((e) => e.id === 'ua1')).toBe(true)
    expect(hidden.some((e) => e.id === 'ka1')).toBe(true)
    expect(live(collapsed).some((e) => e.id === 'ua1')).toBe(false)
    expect(live(collapsed).some((e) => e.id === 'ka1')).toBe(false)
    const expanded = expand(collapsed, a).elements
    expect(live(expanded).some((e) => e.id === 'ua1')).toBe(true)
    expect(live(expanded).some((e) => e.id === 'ka1')).toBe(true)
    expect(metaOf(live(expanded).find((e) => e.id === 'ua1')!)).toMatchObject({ kind: 'underline', nodeId: 'a1' })
  })
})
