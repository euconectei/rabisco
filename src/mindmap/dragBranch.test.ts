import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFreeLayout, nodeAtPoint } from './dragBranch'
import { node } from './testElements'

describe('isFreeLayout', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.__rabiscoFreeLayout
  })

  it('is false outside the E2E build', () => {
    vi.stubEnv('VITE_E2E', '0')
    window.__rabiscoFreeLayout = true
    expect(isFreeLayout()).toBe(false)
  })

  it('is false without the test flag', () => {
    vi.stubEnv('VITE_E2E', '1')
    expect(isFreeLayout()).toBe(false)
  })

  it('is true in the E2E build with the flag on', () => {
    vi.stubEnv('VITE_E2E', '1')
    window.__rabiscoFreeLayout = true
    expect(isFreeLayout()).toBe(true)
  })
})

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
