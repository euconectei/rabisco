import type { MindMap, Side, TreeNode } from './model'

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

const DEFAULT_SIZE: Size = { width: 120, height: 40 }

/**
 * Positions every node of a map. The root stays where it is; first-level children are split
 * left/right (an explicit side wins, otherwise the lighter side); deeper levels inherit the side.
 * Each subtree gets a vertical band as tall as its children (or itself, if taller) and the node is
 * centered on its band, so bands never overlap. Returns top-left positions by node id.
 */
export function layoutMap(map: MindMap, sizes: Map<string, Size>, rootTopLeft: Point): Map<string, Point> {
  const size = (id: string) => sizes.get(id) ?? DEFAULT_SIZE
  const span = new Map<string, number>()
  const measure = (current: TreeNode): number => {
    const childrenSpan =
      current.children.reduce((sum, child) => sum + measure(child), 0) + Math.max(current.children.length - 1, 0) * SIBLING_GAP
    const value = Math.max(size(current.id).height, childrenSpan)
    span.set(current.id, value)
    return value
  }
  for (const child of map.root.children) measure(child)

  const sides: Record<Side, TreeNode[]> = { left: [], right: [] }
  const weight: Record<Side, number> = { left: 0, right: 0 }
  for (const child of map.root.children) {
    const side: Side = child.side ?? (weight.right <= weight.left ? 'right' : 'left')
    sides[side].push(child)
    weight[side] += span.get(child.id)! + SIBLING_GAP
  }

  const positions = new Map<string, Point>([[map.root.id, rootTopLeft]])
  const rootSize = size(map.root.id)

  const place = (nodes: TreeNode[], side: Side, parentX: number, parentWidth: number, centerY: number) => {
    const total = nodes.reduce((sum, n) => sum + span.get(n.id)!, 0) + Math.max(nodes.length - 1, 0) * SIBLING_GAP
    let top = centerY - total / 2
    for (const current of nodes) {
      const own = size(current.id)
      const band = span.get(current.id)!
      const x = side === 'right' ? parentX + parentWidth + LEVEL_GAP : parentX - LEVEL_GAP - own.width
      positions.set(current.id, { x, y: top + band / 2 - own.height / 2 })
      place(current.children, side, x, own.width, top + band / 2)
      top += band + SIBLING_GAP
    }
  }
  const rootCenterY = rootTopLeft.y + rootSize.height / 2
  place(sides.right, 'right', rootTopLeft.x, rootSize.width, rootCenterY)
  place(sides.left, 'left', rootTopLeft.x, rootSize.width, rootCenterY)
  return positions
}

/** The side each first-level child ended up on (persisted so the map does not flip around). */
export function assignedSides(map: MindMap, positions: Map<string, Point>): Map<string, Side> {
  const rootX = positions.get(map.root.id)!.x
  return new Map(map.root.children.map((child) => [child.id, positions.get(child.id)!.x < rootX ? 'left' : 'right']))
}
