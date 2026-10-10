import 'vitest-canvas-mock'
import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { collapse, expand } from './collapse'
import { MINDMAP_PALETTE } from './colors'
import { addChild, createMap } from './commands'
import { metaOf, readMaps, type NodeMeta } from './model'
import { dropTarget, reparent } from './reparent'

type El = ExcalidrawElement & { text?: string; containerId?: string | null; startBinding?: { elementId: string } | null }

const live = (els: readonly ExcalidrawElement[]) => els.filter((e) => !e.isDeleted) as El[]
const rect = (els: readonly ExcalidrawElement[], id: string) => els.find((e) => e.id === id)!
const meta = (els: readonly ExcalidrawElement[], id: string) => metaOf(rect(els, id)) as NodeMeta
const map = (els: readonly ExcalidrawElement[]) => [...readMaps(els).values()][0]

/** Raiz → A (A1 → A1x), B (B1), C */
function sample() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  const a = r.select!
  r = addChild(r.elements, a, 'A1')
  const a1 = r.select!
  r = addChild(r.elements, a1, 'A1x')
  const a1x = r.select!
  r = addChild(r.elements, root, 'B')
  const b = r.select!
  r = addChild(r.elements, b, 'B1')
  const b1 = r.select!
  r = addChild(r.elements, root, 'C')
  const c = r.select!
  return { elements: r.elements, root, a, a1, a1x, b, b1, c }
}

/** Moves a node's rectangle so its center lands on another element's center (a drag, before any relayout). */
function dropOn(els: readonly ExcalidrawElement[], draggedId: string, targetId: string): ExcalidrawElement[] {
  const d = rect(els, draggedId)
  const t = rect(els, targetId)
  const x = t.x + t.width / 2 - d.width / 2
  const y = t.y + t.height / 2 - d.height / 2
  return els.map((e) => (e.id === draggedId ? (newElementWith(e as never, { x, y } as never) as unknown as ExcalidrawElement) : e))
}

describe('dropTarget', () => {
  it('is the node under the dragged node\'s center', () => {
    const s = sample()
    expect(dropTarget(dropOn(s.elements, s.c, s.a1), s.c)).toBe(s.a1)
  })

  it('is never a descendant of the dragged node, nor the node itself', () => {
    const s = sample()
    expect(dropTarget(dropOn(s.elements, s.a, s.a1x), s.a)).toBeNull()
    expect(dropTarget(s.elements, s.a)).toBeNull()
  })

  it('ignores nodes of another map and empty canvas', () => {
    const s = sample()
    const other = createMap([], { x: 2000, y: 2000 }, 'Outro')
    const both = [...s.elements, ...other.elements]
    expect(dropTarget(dropOn(both, s.c, other.select!), s.c)).toBeNull()
    const moved = both.map((e) => (e.id === s.c ? (newElementWith(e as never, { x: -5000, y: -5000 } as never) as unknown as ExcalidrawElement) : e))
    expect(dropTarget(moved, s.c)).toBeNull()
  })
})

describe('reparent', () => {
  it('moves the whole branch under the new parent as its last child', () => {
    const s = sample()
    const { elements, select } = reparent(s.elements, s.a, s.b)
    expect(select).toBe(s.a)
    const m = map(elements)
    expect(m.byId.get(s.b)!.children.map((c) => c.id)).toEqual([s.b1, s.a])
    expect(m.byId.get(s.a1x)!.depth).toBe(4)
    expect(meta(elements, s.a).order).toBeGreaterThan(meta(elements, s.b1).order)
    expect(m.root.children.map((c) => c.id)).toEqual([s.b, s.c])
  })

  it('rebinds the link to the new parent', () => {
    const s = sample()
    const { elements } = reparent(s.elements, s.a, s.b)
    const link = live(elements).find((e) => (metaOf(e) as { childId?: string } | null)?.childId === s.a)!
    expect(link.startBinding?.elementId).toBe(s.b)
    expect(rect(elements, s.b).boundElements?.some((b) => b.id === link.id)).toBe(true)
    expect(rect(elements, s.root).boundElements?.some((b) => b.id === link.id)).toBe(false)
  })

  it('takes the colors of the new branch and drops its own side below the first level', () => {
    const s = sample()
    const { elements } = reparent(s.elements, s.a, s.b)
    expect(rect(elements, s.a).strokeColor).toBe(rect(elements, s.b).strokeColor)
    expect(rect(elements, s.a1x).strokeColor).toBe(rect(elements, s.b).strokeColor)
    expect(meta(elements, s.a).side).toBeNull()
  })

  it('keeps manual colors', () => {
    const s = sample()
    const custom = s.elements.map((e) =>
      e.id === s.a1
        ? (newElementWith(e as never, { strokeColor: '#ff00ff', customData: { rabisco: { ...meta(s.elements, s.a1), colorAuto: false } } } as never) as unknown as ExcalidrawElement)
        : e,
    )
    const { elements } = reparent(custom, s.a, s.b)
    expect(rect(elements, s.a1).strokeColor).toBe('#ff00ff')
  })

  it('dropped on the root, takes the side where it was dropped', () => {
    const s = sample()
    const root = rect(s.elements, s.root)
    const leftOfRoot = s.elements.map((e) =>
      e.id === s.a1 ? (newElementWith(e as never, { x: root.x - 400, y: root.y } as never) as unknown as ExcalidrawElement) : e,
    )
    const { elements } = reparent(leftOfRoot, s.a1, s.root)
    expect(meta(elements, s.a1).parentId).toBe(s.root)
    expect(meta(elements, s.a1).side).toBe('left')
    expect(rect(elements, s.a1).x).toBeLessThan(rect(elements, s.root).x)
    expect(MINDMAP_PALETTE).toContain(rect(elements, s.a1).strokeColor)
  })

  it('a collapsed node carries its hidden branch along', () => {
    const s = sample()
    const collapsed = collapse(s.elements, s.a1).elements
    const moved = reparent(collapsed, s.a1, s.c).elements
    expect(meta(moved, s.a1).parentId).toBe(s.c)
    const reopened = expand(moved, s.a1).elements
    expect(map(reopened).byId.get(s.a1x)!.parentId).toBe(s.a1)
    expect(map(reopened).byId.get(s.a1)!.parentId).toBe(s.c)
  })

  it('refuses a target inside the moved branch, or moving the root', () => {
    const s = sample()
    expect(reparent(s.elements, s.a, s.a1x).elements).toEqual(s.elements)
    expect(reparent(s.elements, s.root, s.b).elements).toEqual(s.elements)
  })
})
