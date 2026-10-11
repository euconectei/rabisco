import 'vitest-canvas-mock'
import { describe, expect, it } from 'vitest'
import { collapse } from './collapse'
import { addChild, createMap } from './commands'
import { badgeNodeAtPoint, nodeAtPoint } from './dragBranch'
import { metaOf } from './model'
import { node } from './testElements'

describe('nodeAtPoint', () => {
  it('finds the node under the point', () => {
    expect(nodeAtPoint([node('a', null)], { x: 10, y: 10 })).toBe('a')
  })

  it('returns null outside every node', () => {
    expect(nodeAtPoint([node('a', null)], { x: 999, y: 999 })).toBeNull()
  })

  it('returns the topmost node when nodes overlap', () => {
    const a = node('a', null)
    const b = node('b', 'a')
    expect(nodeAtPoint([a, b], { x: 10, y: 10 })).toBe('b')
  })

  it('ignores deleted nodes', () => {
    const a = node('a', null)
    const deleted = { ...node('d', null), isDeleted: true }
    expect(nodeAtPoint([deleted, a], { x: 10, y: 10 })).toBe('a')
  })
})

describe('badgeNodeAtPoint', () => {
  function collapsed() {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    const root = r.select!
    r = addChild(r.elements, root, 'A')
    const a = r.select!
    r = addChild(r.elements, a, 'A1')
    const elements = collapse(r.elements, a).elements
    const badge = elements.find((e) => e.id === (metaOf(elements.find((n) => n.id === a)!) as { badgeId: string }).badgeId)!
    return { elements, a, badge }
  }

  it('finds the node whose own badge is under the point', () => {
    const { elements, a, badge } = collapsed()
    expect(badgeNodeAtPoint(elements, { x: badge.x + badge.width / 2, y: badge.y + badge.height / 2 })).toBe(a)
    expect(badgeNodeAtPoint(elements, { x: badge.x - 50, y: badge.y })).toBeNull()
  })

  it('ignores a copy of the badge', () => {
    const { elements, badge } = collapsed()
    const copy = { ...badge, id: 'copy', x: badge.x + 300 }
    expect(badgeNodeAtPoint([...elements, copy], { x: copy.x + 2, y: copy.y + 2 })).toBeNull()
  })
})
