import { convertToExcalidrawElements, ROUNDNESS } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { newId } from './elements'
import { metaOf, type EdgeMeta, type KnobMeta, type Side, type UnderlineMeta } from './model'

// The "lines" style: each non-root node gets an underline (the base of the node), each node with
// children a hollow knob at the child-facing tip of the underline, and every child a curved line
// from its parent's knob to the start of its own underline. All three are locked and derived from
// the nodes, so relayout() recreates them after every change.

/** Vertical gap between siblings in the lines style (boxes use SIBLING_GAP from layout.ts). */
export const LINE_SIBLING_GAP = 24
/** Diameter of the hollow knob at the tip of an underline. */
export const KNOB_SIZE = 8
/** Horizontal padding inside a lines-style node, around its left-aligned text. */
export const LINE_NODE_PADDING_X = 12
/** Vertical padding inside a lines-style node, above and below its text. */
export const LINE_NODE_PADDING_Y = 8

export function lineSiblingGap(): number {
  return LINE_SIBLING_GAP
}

export function underlineMeta(mapId: string, nodeId: string): UnderlineMeta {
  return { kind: 'underline', mapId, nodeId }
}

export function knobMeta(mapId: string, nodeId: string): KnobMeta {
  return { kind: 'knob', mapId, nodeId }
}

export function edgeMeta(mapId: string, childId: string): EdgeMeta {
  return { kind: 'edge', mapId, childId }
}

export function underlineGeometry(node: ExcalidrawElement): { x: number; y: number; width: number; height: number; points: [number, number][] } {
  return { x: node.x, y: node.y + node.height, width: node.width, height: 0, points: [[0, 0], [node.width, 0]] }
}

export function knobGeometry(node: ExcalidrawElement, side: Side | null): { x: number; y: number; width: number; height: number } {
  const right = side !== 'left'
  const tipX = right ? node.x + node.width : node.x
  const tipY = node.y + node.height
  return { x: tipX - KNOB_SIZE / 2, y: tipY - KNOB_SIZE / 2, width: KNOB_SIZE, height: KNOB_SIZE }
}

/**
 * A loose curved line from a parent's knob (or the root's border) to the start of the child's
 * underline: four points, leaving and entering horizontally, rounded at the corners, not bound to
 * either node.
 */
export function lineEdgeGeometry(parent: ExcalidrawElement, child: ExcalidrawElement): { x: number; y: number; width: number; height: number; points: [number, number][] } {
  const parentMeta = metaOf(parent)
  const isRoot = parentMeta?.kind === 'node' && parentMeta.parentId === null
  const right = child.x + child.width / 2 >= parent.x + parent.width / 2
  const startY = isRoot ? parent.y + parent.height / 2 : parent.y + parent.height
  const start = { x: right ? parent.x + parent.width : parent.x, y: startY }
  const end = { x: right ? child.x : child.x + child.width, y: child.y + child.height }
  const dx = end.x - start.x
  const dy = end.y - start.y
  return { x: start.x, y: start.y, width: Math.abs(dx), height: Math.abs(dy), points: [[0, 0], [dx * 0.3, 0], [dx * 0.7, dy], [dx, dy]] }
}

/** The thin line at the base of a non-root node, end to end, in the branch color. */
export function createUnderline(node: ExcalidrawElement, color: string, mapId: string): ExcalidrawElement {
  const [underline] = convertToExcalidrawElements(
    [{ type: 'line', id: newId(), ...underlineGeometry(node), strokeColor: color, roughness: 0, locked: true, customData: { rabisco: underlineMeta(mapId, node.id) } }],
    { regenerateIds: false },
  )
  return underline as ExcalidrawElement
}

/** A hollow circle at the tip of the underline that faces the children, only on nodes that have some. */
export function createKnob(node: ExcalidrawElement, color: string, mapId: string, side: Side | null, hasChildren: boolean): ExcalidrawElement | null {
  if (!hasChildren) return null
  const [knob] = convertToExcalidrawElements(
    [
      {
        type: 'ellipse',
        id: newId(),
        ...knobGeometry(node, side),
        strokeColor: color,
        backgroundColor: 'transparent',
        roughness: 0,
        locked: true,
        customData: { rabisco: knobMeta(mapId, node.id) },
      },
    ],
    { regenerateIds: false },
  )
  return knob as ExcalidrawElement
}

/** A locked curved line from the parent to the child, without arrowheads or binding. */
export function createLineEdge(mapId: string, parent: ExcalidrawElement, child: ExcalidrawElement, color: string): ExcalidrawElement {
  const [edge] = convertToExcalidrawElements(
    [
      {
        type: 'line',
        id: newId(),
        ...lineEdgeGeometry(parent, child),
        roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
        strokeColor: color,
        roughness: 0,
        locked: true,
        customData: { rabisco: edgeMeta(mapId, child.id) },
      },
    ],
    { regenerateIds: false },
  )
  return edge as ExcalidrawElement
}
