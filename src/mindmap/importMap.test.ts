import 'vitest-canvas-mock'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { importOutline } from './importMap'
import { mapToOutline, type OutlineNode } from './markdown'
import { metaOf, readMaps } from './model'

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
