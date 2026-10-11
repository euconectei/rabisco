import { branchIds, layoutOf, metaOf, readMaps, sideOf, styleOf } from './model'
import { node, plain, underline } from './testElements'

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

it('recognizes lines-style decorations as Rabisco metadata', () => {
  expect(metaOf(underline('u', 'a'))).toMatchObject({ kind: 'underline', mapId: 'm1', nodeId: 'a' })
  const wrong = { ...underline('u', 'a'), customData: { rabisco: { kind: 'blob', mapId: 'm1', nodeId: 'a' } } } as never
  expect(metaOf(wrong)).toBeNull()
})

it('defaults layout and style for maps without the fields, and for unknown maps', () => {
  const elements = [node('r', null), node('a', 'r')]
  expect(layoutOf(elements, 'm1')).toBe('both')
  expect(styleOf(elements, 'm1')).toBe('boxes')
  expect(layoutOf(elements, 'nope')).toBe('both')
  expect(styleOf(elements, 'nope')).toBe('boxes')
})

it('reads layout and style stored on the root', () => {
  const elements = [node('r', null, 0, { layout: 'right', style: 'lines' }), node('a', 'r')]
  expect(layoutOf(elements, 'm1')).toBe('right')
  expect(styleOf(elements, 'm1')).toBe('lines')
})

it('reads an old map without layout/style and does not change its customData', () => {
  const root = node('r', null)
  const elements = [root, node('a', 'r')]
  const map = readMaps(elements).get('m1')!
  expect(map.root.id).toBe('r')
  expect(map.root.children.map((c) => c.id)).toEqual(['a'])
  expect(elements[0]).toBe(root)
  const rabisco = (root.customData as { rabisco: { layout?: unknown; style?: unknown } }).rabisco
  expect(rabisco.layout).toBeUndefined()
  expect(rabisco.style).toBeUndefined()
})

it('memoizes by elements array identity: the same array returns the same map', () => {
  const elements = [node('r', null), node('a', 'r')]
  expect(readMaps(elements)).toBe(readMaps(elements))
})

it('a new elements array, even with the same content, returns a fresh map', () => {
  const elements = [node('r', null), node('a', 'r')]
  const copy = [node('r', null), node('a', 'r')]
  expect(readMaps(elements)).not.toBe(readMaps(copy))
})

it('an element changed in place (as Excalidraw does mid-drag, bumping its version) is read again', () => {
  const elements = [node('r', null), node('a', 'r'), node('b', 'r')]
  expect(readMaps(elements).values().next().value!.byId.size).toBe(3)
  // Excalidraw's mutateElement edits the element object inside the same array and bumps its version.
  const b = elements[2] as unknown as { isDeleted: boolean; version: number }
  b.isDeleted = true
  b.version = 2
  expect(readMaps(elements).values().next().value!.byId.size).toBe(2)
})
