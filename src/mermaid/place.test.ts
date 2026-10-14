import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { centerOn } from './place'

const box = (id: string, x: number, y: number, width: number, height: number) => ({ id, x, y, width, height }) as ExcalidrawElement

describe('centerOn', () => {
  it('puts the centre of the group on the target, keeping the distances between elements', () => {
    const [a, b] = centerOn([box('a', 0, 0, 100, 50), box('b', 200, 100, 100, 100)], { x: 1000, y: 500 })
    expect(a.x + 150).toBe(1000)
    expect(a.y + 100).toBe(500)
    expect(b.x - a.x).toBe(200)
    expect(b.y - a.y).toBe(100)
  })

  it('does not mutate the input and handles an empty list', () => {
    const input = box('a', 0, 0, 10, 10)
    centerOn([input], { x: 50, y: 50 })
    expect(input.x).toBe(0)
    expect(centerOn([], { x: 1, y: 1 })).toEqual([])
  })
})
