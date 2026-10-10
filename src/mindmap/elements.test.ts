import 'vitest-canvas-mock'
import { createEdgeElement, createNodeElements } from './elements'
import { metaOf } from './model'

it('creates a rectangle with bound text and valid Rabisco metadata', () => {
  const [rect, text] = createNodeElements({ mapId: 'm', parentId: null, order: 0, side: null, text: 'Ideia', x: 10, y: 20, color: '#1e1e1e', isRoot: true })
  expect(rect.type).toBe('rectangle')
  expect(text.type).toBe('text')
  expect((text as unknown as { containerId: string }).containerId).toBe(rect.id)
  expect((text as unknown as { text: string }).text).toBe('Ideia')
  expect(metaOf(rect)).toMatchObject({ kind: 'node', mapId: 'm', nodeId: rect.id, parentId: null, colorAuto: true })
})

it('creates a link bound to both nodes, without arrowheads', () => {
  const [parent] = createNodeElements({ mapId: 'm', parentId: null, order: 0, side: null, text: 'A', x: 0, y: 0, color: '#000000', isRoot: true })
  const [child] = createNodeElements({ mapId: 'm', parentId: parent.id, order: 0, side: null, text: 'B', x: 300, y: 0, color: '#1971c2', isRoot: false })
  const edge = createEdgeElement({ mapId: 'm', parent, child, color: '#1971c2' }) as unknown as {
    type: string; startBinding: { elementId: string }; endBinding: { elementId: string }; startArrowhead: null; endArrowhead: null; strokeColor: string
  }
  expect(edge.type).toBe('arrow')
  expect(edge.startBinding.elementId).toBe(parent.id)
  expect(edge.endBinding.elementId).toBe(child.id)
  expect(edge.startArrowhead).toBeNull()
  expect(edge.endArrowhead).toBeNull()
  expect(metaOf(edge as never)).toMatchObject({ kind: 'edge', mapId: 'm', childId: child.id })
})
