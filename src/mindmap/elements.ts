import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { Size } from './layout'
import type { EdgeMeta, NodeMeta, Side } from './model'

export const TEXT_COLOR = '#1e1e1e'

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 21)
}

export interface NodeInput {
  mapId: string
  parentId: string | null
  order: number
  side: Side | null
  text: string
  x: number
  y: number
  color: string
  isRoot: boolean
}

/** A node: rounded rectangle with bound text; the Rabisco metadata lives on the rectangle. */
export function createNodeElements(input: NodeInput): ExcalidrawElement[] {
  const id = newId()
  const meta: NodeMeta = {
    kind: 'node',
    mapId: input.mapId,
    nodeId: id,
    parentId: input.parentId,
    order: input.order,
    side: input.side,
    colorAuto: true,
  }
  return convertToExcalidrawElements(
    [
      {
        type: 'rectangle',
        id,
        x: input.x,
        y: input.y,
        width: input.isRoot ? 180 : 140,
        height: input.isRoot ? 56 : 44,
        strokeColor: input.color,
        backgroundColor: 'transparent',
        strokeWidth: input.isRoot ? 2 : 1,
        roundness: { type: 3 },
        label: { text: input.text, fontSize: input.isRoot ? 24 : 20, strokeColor: TEXT_COLOR },
        customData: { rabisco: meta },
      },
    ],
    { regenerateIds: false },
  ) as ExcalidrawElement[]
}

/** A link: an arrow without heads, bound to both nodes. relayout() recomputes its points. */
export function createEdgeElement(input: {
  mapId: string
  parent: ExcalidrawElement
  child: ExcalidrawElement
  color: string
}): ExcalidrawElement {
  const meta: EdgeMeta = { kind: 'edge', mapId: input.mapId, childId: input.child.id }
  const [edge] = convertToExcalidrawElements(
    [
      {
        type: 'arrow',
        id: newId(),
        x: input.parent.x + input.parent.width,
        y: input.parent.y + input.parent.height / 2,
        startArrowhead: null,
        endArrowhead: null,
        strokeColor: input.color,
        customData: { rabisco: meta },
      },
    ],
    { regenerateIds: false },
  )
  // The skeleton converter only binds to elements created in the same batch, so bind explicitly.
  // Callers must also list the edge in both nodes' boundElements (see bindEdge).
  return {
    ...(edge as ExcalidrawElement),
    startBinding: { elementId: input.parent.id, focus: 0, gap: 1 },
    endBinding: { elementId: input.child.id, focus: 0, gap: 1 },
  } as ExcalidrawElement
}

/** Registers the edge on both nodes so Excalidraw drags it along with them. */
export function withBoundEdge(node: ExcalidrawElement, edgeId: string): ExcalidrawElement {
  const bound = node.boundElements ?? []
  if (bound.some((b) => b.id === edgeId)) return node
  return { ...node, boundElements: [...bound, { id: edgeId, type: 'arrow' }] } as ExcalidrawElement
}

export function nodeSize(element: ExcalidrawElement): Size {
  return { width: element.width, height: element.height }
}
