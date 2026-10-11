import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { ROOT_COLOR } from './colors'
import { createMap, relayout, type CommandResult } from './commands'
import { createEdgeElement, createNodeElements, withBoundEdge } from './elements'
import type { Point } from './layout'
import type { OutlineNode } from './markdown'
import { metaOf, type NodeMeta } from './model'

/**
 * Creates a mind map from an outline, its root centered on `at`; selects the root. All nodes and
 * links are built in one pass and laid out a single time at the end, so the cost is O(n) instead of
 * the O(n²) of adding each node through `addChild` (which re-reads and re-lays the map per node).
 */
export function importOutline(elements: readonly ExcalidrawElement[], outline: OutlineNode, at: Point): CommandResult {
  const created = createMap(elements, at, outline.text)
  const rootId = created.select!
  // createMap appends the root rectangle and its bound text, in that order.
  const [root, rootText] = created.elements.slice(elements.length)
  const mapId = (metaOf(root) as NodeMeta).mapId

  // Each node's rectangle is updated in place (via withBoundEdge) as its children's links are built,
  // so read the final versions from here once the whole tree is done.
  const rects = new Map<string, ExcalidrawElement>([[rootId, root]])
  const textByNode = new Map<string, ExcalidrawElement>([[rootId, rootText]])
  const nodeOrder: string[] = []
  const edges: ExcalidrawElement[] = []

  const grow = (parentId: string, children: OutlineNode[]) => {
    children.forEach((child, order) => {
      const [childRect, childText] = createNodeElements({ mapId, parentId, order, side: null, text: child.text, x: 0, y: 0, color: ROOT_COLOR, isRoot: false })
      const edge = createEdgeElement({ mapId, parent: rects.get(parentId)!, child: childRect, color: ROOT_COLOR })
      edges.push(edge)
      rects.set(parentId, withBoundEdge(rects.get(parentId)!, edge.id))
      rects.set(childRect.id, withBoundEdge(childRect, edge.id))
      textByNode.set(childRect.id, childText)
      nodeOrder.push(childRect.id)
      grow(childRect.id, child.children)
    })
  }
  grow(rootId, outline.children)

  const nodes = [rects.get(rootId)!, textByNode.get(rootId)!]
  for (const id of nodeOrder) nodes.push(rects.get(id)!, textByNode.get(id)!)

  // Links go first so they are drawn under the nodes.
  return { elements: relayout([...elements, ...edges, ...nodes], mapId), select: rootId }
}
