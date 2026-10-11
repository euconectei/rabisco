import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { addChild, createMap } from './commands'
import { importOutline } from './importMap'
import { mapToOutline, type OutlineNode } from './markdown'
import { metaOf, readMaps, type NodeMeta, type Side } from './model'

const n = (text: string, ...children: OutlineNode[]): OutlineNode => ({ text, children })

function noOverlap(els: readonly ExcalidrawElement[]) {
  const boxes = els.filter((e) => !e.isDeleted && metaOf(e)?.kind === 'node')
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) return false
    }
  return true
}

interface Snapshot {
  x: number
  y: number
  color: string
  order: number
  side: Side | null
  parent: string | null
}

/** Every node keyed by its text, with the observable state that must survive the rewrite. */
function snapshot(elements: readonly ExcalidrawElement[]): Map<string, Snapshot> {
  const textByContainer = new Map<string, string>()
  for (const e of elements) {
    if (e.isDeleted) continue
    const container = (e as { containerId?: string | null }).containerId
    if (container) textByContainer.set(container, (e as { text?: string }).text ?? '')
  }
  const out = new Map<string, Snapshot>()
  for (const e of elements) {
    if (e.isDeleted) continue
    const meta = metaOf(e) as NodeMeta | null
    if (meta?.kind !== 'node') continue
    const text = textByContainer.get(e.id) ?? ''
    out.set(text, {
      x: e.x,
      y: e.y,
      color: e.strokeColor,
      order: meta.order,
      side: meta.side,
      parent: meta.parentId === null ? null : (textByContainer.get(meta.parentId) ?? null),
    })
  }
  return out
}

it('creates a laid-out map with the same tree, next to what is already on the canvas', () => {
  const outline = n('Projeto', n('Pesquisa', n('entrevistas'), n('dados')), n('Protótipo', n('tela 1')), n('Testes'))
  const existing = [{ id: 'other', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, isDeleted: false } as unknown as ExcalidrawElement]
  const { elements, select } = importOutline(existing, outline, { x: 500, y: 300 })
  expect(elements.find((e) => e.id === 'other')).toBe(existing[0])
  const maps = [...readMaps(elements).values()]
  expect(maps).toHaveLength(1)
  expect(maps[0].root.id).toBe(select)
  expect(mapToOutline(elements, maps[0].mapId)).toEqual(outline)
  expect(noOverlap(elements)).toBe(true)
  const root = elements.find((e) => e.id === select)!
  expect(Math.abs(root.x + root.width / 2 - 500)).toBeLessThan(1)
})

it('imports the same tree, texts, colors and positions as adding each node one by one', () => {
  const outline = n('Raiz', n('A', n('A1'), n('A2')), n('B', n('B1', n('B1a'))), n('C'))
  const imported = importOutline([], outline, { x: 0, y: 0 })
  // The pre-rewrite behavior, replayed here through addChild, is the reference.
  let reference = createMap([], { x: 0, y: 0 }, 'Raiz')
  const grow = (parentId: string, children: OutlineNode[]) => {
    for (const child of children) {
      const result = addChild(reference.elements, parentId, child.text)
      reference = { elements: result.elements, select: result.select }
      grow(result.select!, child.children)
    }
  }
  grow(reference.select!, outline.children)

  const maps = [...readMaps(imported.elements).values()]
  expect(maps).toHaveLength(1)
  expect(imported.select).toBe(maps[0].root.id)
  expect(mapToOutline(imported.elements, maps[0].mapId)).toEqual(outline)
  expect(snapshot(imported.elements)).toEqual(snapshot(reference.elements))
  expect(noOverlap(imported.elements)).toBe(true)

  // Every link is bound to both nodes, so dragging a node drags its links.
  const edges = imported.elements.filter((e) => !e.isDeleted && metaOf(e)?.kind === 'edge')
  expect(edges).toHaveLength(7)
  for (const edge of edges) {
    const { startBinding, endBinding } = edge as unknown as { startBinding: { elementId: string }; endBinding: { elementId: string } }
    expect(imported.elements.find((e) => e.id === startBinding.elementId)!.boundElements?.some((b) => b.id === edge.id)).toBe(true)
    expect(imported.elements.find((e) => e.id === endBinding.elementId)!.boundElements?.some((b) => b.id === edge.id)).toBe(true)
  }
})

it('imports a 1500-node outline in under 1.5 s', () => {
  const outline = n('Raiz', ...Array.from({ length: 30 }, (_, i) => n(`T${i}`, ...Array.from({ length: 49 }, (_, j) => n(`T${i}-${j}`)))))
  const started = performance.now()
  const { elements } = importOutline([], outline, { x: 0, y: 0 })
  const elapsed = performance.now() - started
  const map = [...readMaps(elements).values()][0]
  expect(map.byId.size).toBe(1501)
  expect(elapsed).toBeLessThan(1500)
})
