import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { parseScene, serializeScene } from '../editor/scene'
import { badgeOf, collapse, expand, toggleCollapse } from './collapse'
import { addChild, branchElementIds, createMap } from './commands'
import { metaOf, readMaps, type NodeMeta } from './model'

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
