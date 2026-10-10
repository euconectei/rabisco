import { describe, expect, it } from 'vitest'
import { nodeAtPoint } from './dragBranch'
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
