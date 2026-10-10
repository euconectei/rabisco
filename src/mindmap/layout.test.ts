import { assignedSides, layoutMap, LEVEL_GAP, SIBLING_GAP, type LayoutOptions, type Point, type Size } from './layout'
import { readMaps } from './model'
import { node } from './testElements'

const W = 120
const H = 40
const ROOT = { x: 0, y: 0 }
const BOTH: LayoutOptions = { layout: 'both', siblingGap: SIBLING_GAP }
const RIGHT: LayoutOptions = { layout: 'right', siblingGap: SIBLING_GAP }

function mapOf(...elements: ReturnType<typeof node>[]) {
  return readMaps(elements).get('m1')!
}

function sizesFor(ids: string[], overrides: Record<string, Size> = {}) {
  return new Map(ids.map((id) => [id, overrides[id] ?? { width: W, height: H }]))
}

function overlaps(positions: Map<string, Point>, sizes: Map<string, Size>) {
  const boxes = [...positions].map(([id, p]) => ({ id, ...p, ...sizes.get(id)! }))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) return `${a.id}×${b.id}`
    }
  }
  return null
}

it('keeps the root where it is and puts a single child to the right, centered', () => {
  const map = mapOf(node('r', null), node('a', 'r'))
  const positions = layoutMap(map, sizesFor(['r', 'a']), ROOT, BOTH)
  expect(positions.get('r')).toEqual(ROOT)
  expect(positions.get('a')).toEqual({ x: W + LEVEL_GAP, y: 0 })
})

it('balances first-level children between right and left, in order', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0), node('b', 'r', 1), node('c', 'r', 2))
  const positions = layoutMap(map, sizesFor(['r', 'a', 'b', 'c']), ROOT, BOTH)
  const sides = assignedSides(map, positions)
  expect([sides.get('a'), sides.get('b'), sides.get('c')]).toEqual(['right', 'left', 'right'])
  expect(positions.get('b')!.x).toBe(-LEVEL_GAP - W)
  expect(positions.get('c')!.y - positions.get('a')!.y).toBe(H + SIBLING_GAP)
})

it('places grandchildren on the parent side, one level further', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0, { side: 'left' }), node('a1', 'a'))
  const positions = layoutMap(map, sizesFor(['r', 'a', 'a1']), ROOT, BOTH)
  expect(positions.get('a')!.x).toBe(-LEVEL_GAP - W)
  expect(positions.get('a1')!.x).toBe(positions.get('a')!.x - LEVEL_GAP - W)
})

it('gives a tall node its height and pushes siblings apart', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0, { side: 'right' }), node('b', 'r', 1, { side: 'right' }))
  const sizes = sizesFor(['r', 'a', 'b'], { a: { width: W, height: 120 } })
  const positions = layoutMap(map, sizes, ROOT, BOTH)
  expect(positions.get('b')!.y - positions.get('a')!.y).toBe(120 + SIBLING_GAP)
  expect(overlaps(positions, sizes)).toBeNull()
})

it('respects an explicit side even when unbalanced', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0, { side: 'left' }), node('b', 'r', 1, { side: 'left' }))
  const sides = assignedSides(map, layoutMap(map, sizesFor(['r', 'a', 'b']), ROOT, BOTH))
  expect([sides.get('a'), sides.get('b')]).toEqual(['left', 'left'])
})

it('never overlaps nodes in a large, uneven tree', () => {
  const elements = [node('r', null)]
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const sizes: Record<string, Size> = {}
  for (let i = 1; i < 40; i++) {
    const parent = i < 5 ? 'r' : `n${Math.floor(rand() * (i - 1)) + 1}`
    elements.push(node(`n${i}`, parent === 'n0' ? 'r' : parent, i))
    sizes[`n${i}`] = { width: 80 + Math.floor(rand() * 120), height: 30 + Math.floor(rand() * 60) }
  }
  const map = mapOf(...elements)
  const allSizes = sizesFor([...map.byId.keys()], sizes)
  const positions = layoutMap(map, allSizes, ROOT, BOTH)
  expect(positions.size).toBe(map.byId.size)
  expect(overlaps(positions, allSizes)).toBeNull()
})

it('right layout puts every first-level branch to the right, stacked by order, root centered', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0), node('b', 'r', 1), node('c', 'r', 2))
  const sizes = sizesFor(['r', 'a', 'b', 'c'])
  const positions = layoutMap(map, sizes, ROOT, RIGHT)
  const root = positions.get('r')!
  expect(positions.get('a')!.x).toBeGreaterThan(root.x)
  expect(positions.get('b')!.x).toBeGreaterThan(root.x)
  expect(positions.get('c')!.x).toBeGreaterThan(root.x)
  expect(positions.get('a')!.y).toBeLessThan(positions.get('b')!.y)
  expect(positions.get('b')!.y).toBeLessThan(positions.get('c')!.y)
  expect(overlaps(positions, sizes)).toBeNull()
  // The root is vertically centered on the total height of its children.
  const top = Math.min(...['a', 'b', 'c'].map((id) => positions.get(id)!.y))
  const bottom = Math.max(...['a', 'b', 'c'].map((id) => positions.get(id)!.y + sizes.get(id)!.height))
  expect(root.y + sizes.get('r')!.height / 2).toBeCloseTo((top + bottom) / 2)
})

it('right layout ignores a stored side: a left-side branch still goes right', () => {
  const map = mapOf(node('r', null), node('a', 'r', 0, { side: 'left' }))
  const positions = layoutMap(map, sizesFor(['r', 'a']), ROOT, RIGHT)
  expect(positions.get('a')!.x).toBeGreaterThan(positions.get('r')!.x)
})

it('right layout never overlaps nodes in a large, uneven tree', () => {
  const elements = [node('r', null)]
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const sizes: Record<string, Size> = {}
  for (let i = 1; i < 40; i++) {
    const parent = i < 5 ? 'r' : `n${Math.floor(rand() * (i - 1)) + 1}`
    elements.push(node(`n${i}`, parent === 'n0' ? 'r' : parent, i))
    sizes[`n${i}`] = { width: 80 + Math.floor(rand() * 120), height: 30 + Math.floor(rand() * 60) }
  }
  const map = mapOf(...elements)
  const allSizes = sizesFor([...map.byId.keys()], sizes)
  const positions = layoutMap(map, allSizes, ROOT, RIGHT)
  expect(positions.size).toBe(map.byId.size)
  expect(overlaps(positions, allSizes)).toBeNull()
})
