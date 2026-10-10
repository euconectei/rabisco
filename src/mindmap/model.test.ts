import { branchIds, readMaps, sideOf } from './model'
import { node, plain } from './testElements'

it('reads a map with ordered children and depths', () => {
  const maps = readMaps([node('r', null), node('b', 'r', 2), node('a', 'r', 1), node('a1', 'a', 0), plain('free')])
  const map = maps.get('m1')!
  expect(map.root.id).toBe('r')
  expect(map.root.children.map((c) => c.id)).toEqual(['a', 'b'])
  expect(map.byId.get('a1')!.depth).toBe(2)
  expect(maps.size).toBe(1)
})

it('ignores deleted elements and elements without metadata', () => {
  const deleted = { ...node('b', 'r', 1), isDeleted: true } as typeof plainEl
  const plainEl = plain('x')
  const map = readMaps([node('r', null), node('a', 'r', 0), deleted, plainEl]).get('m1')!
  expect([...map.byId.keys()].sort()).toEqual(['a', 'r'])
})

it('drops orphans and cycles, keeping the rest of the map', () => {
  const map = readMaps([node('r', null), node('a', 'r'), node('orphan', 'missing'), node('x', 'y'), node('y', 'x')]).get('m1')!
  expect([...map.byId.keys()].sort()).toEqual(['a', 'r'])
})

it('ignores a map with two roots or with broken metadata', () => {
  expect(readMaps([node('r1', null), node('r2', null)]).size).toBe(0)
  const broken = { ...plain('z'), customData: { rabisco: { kind: 'node', mapId: 42 } } } as unknown as ReturnType<typeof plain>
  const wrongKind = { ...plain('w'), customData: { rabisco: { kind: 'blob', mapId: 'm1' } } } as unknown as ReturnType<typeof plain>
  expect(readMaps([broken, wrongKind]).size).toBe(0)
})

it('keeps two maps in the same drawing apart', () => {
  const maps = readMaps([node('r', null), node('a', 'r'), node('R', null, 0, {}, 'm2'), node('B', 'R', 0, {}, 'm2')])
  expect(maps.get('m1')!.root.children.map((c) => c.id)).toEqual(['a'])
  expect(maps.get('m2')!.root.children.map((c) => c.id)).toEqual(['B'])
})

it('inherits the side from the first-level ancestor (right by default)', () => {
  const map = readMaps([node('r', null), node('a', 'r', 0, { side: 'left' }), node('a1', 'a'), node('b', 'r', 1), node('b1', 'b')]).get('m1')!
  expect(sideOf(map, 'a1')).toBe('left')
  expect(sideOf(map, 'b1')).toBe('right')
  expect(sideOf(map, 'r')).toBeNull()
})

it('lists a node and all its descendants', () => {
  const map = readMaps([node('r', null), node('a', 'r'), node('a1', 'a'), node('a2', 'a'), node('b', 'r', 1)]).get('m1')!
  expect(branchIds(map, 'a').sort()).toEqual(['a', 'a1', 'a2'])
  expect(branchIds(map, 'missing')).toEqual([])
})
