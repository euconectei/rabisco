import type { MapLayout, MindMap, Side, TreeNode } from './model'

export const LEVEL_GAP = 80
export const SIBLING_GAP = 16

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** How to lay a map out: the organization and the vertical gap between siblings. */
export interface LayoutOptions {
  layout: Exclude<MapLayout, 'free'>
  siblingGap: number
}

const DEFAULT_SIZE: Size = { width: 120, height: 40 }

/**
 * Positions every node of a map. 'both' splits first-level children left/right (an explicit side
 * wins, otherwise the lighter side); 'right' puts them all on the right, stacked by order, with the
 * root vertically centered on their total height. Deeper levels inherit the side. Each subtree gets a
 * vertical band as tall as its children (or itself, if taller) and the node is centered on its band,
 * so bands never overlap. Returns top-left positions by node id.
 */
export function layoutMap(map: MindMap, sizes: Map<string, Size>, rootTopLeft: Point, options: LayoutOptions): Map<string, Point> {
  const size = (id: string) => sizes.get(id) ?? DEFAULT_SIZE
  const { siblingGap } = options
  const span = new Map<string, number>()
  const measure = (current: TreeNode): number => {
    const childrenSpan =
      current.children.reduce((sum, child) => sum + measure(child), 0) + Math.max(current.children.length - 1, 0) * siblingGap
    const value = Math.max(size(current.id).height, childrenSpan)
    span.set(current.id, value)
    return value
  }
  for (const child of map.root.children) measure(child)

  const positions = new Map<string, Point>()
  const rootSize = size(map.root.id)

  const place = (nodes: TreeNode[], side: Side, parentX: number, parentWidth: number, centerY: number) => {
    const total = nodes.reduce((sum, n) => sum + span.get(n.id)!, 0) + Math.max(nodes.length - 1, 0) * siblingGap
    let top = centerY - total / 2
    for (const current of nodes) {
      const own = size(current.id)
      const band = span.get(current.id)!
      const x = side === 'right' ? parentX + parentWidth + LEVEL_GAP : parentX - LEVEL_GAP - own.width
      positions.set(current.id, { x, y: top + band / 2 - own.height / 2 })
      place(current.children, side, x, own.width, top + band / 2)
      top += band + siblingGap
    }
  }
  const rootCenterY = rootTopLeft.y + rootSize.height / 2

  if (options.layout === 'right') {
    // All first-level branches to the right, stacked by order; the root keeps its x and stays
    // vertically centered because the children are centered on it.
    positions.set(map.root.id, rootTopLeft)
    place(map.root.children, 'right', rootTopLeft.x, rootSize.width, rootCenterY)
    return positions
  }

  const sides: Record<Side, TreeNode[]> = { left: [], right: [] }
  const weight: Record<Side, number> = { left: 0, right: 0 }
  for (const child of map.root.children) {
    const side: Side = child.side ?? (weight.right <= weight.left ? 'right' : 'left')
    sides[side].push(child)
    weight[side] += span.get(child.id)! + siblingGap
  }

  positions.set(map.root.id, rootTopLeft)
  place(sides.right, 'right', rootTopLeft.x, rootSize.width, rootCenterY)
  place(sides.left, 'left', rootTopLeft.x, rootSize.width, rootCenterY)
  return positions
}

/** The side each first-level child ended up on (persisted so the map does not flip around). */
export function assignedSides(map: MindMap, positions: Map<string, Point>): Map<string, Side> {
  const rootX = positions.get(map.root.id)!.x
  return new Map(map.root.children.map((child) => [child.id, positions.get(child.id)!.x < rootX ? 'left' : 'right']))
}
