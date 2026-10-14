import type { ExcalidrawElementSkeleton } from './skeleton'
import { diamondMinWidth, widenDiamonds } from './diamond'

const diamond = (width: number, text: string, x = 100) =>
  ({ type: 'diamond', id: 'd', x, y: 0, width, height: 80, label: { text } }) as unknown as ExcalidrawElementSkeleton

describe('widenDiamonds', () => {
  it('widens a diamond that is too narrow for its longest word, keeping its centre', () => {
    const [result] = widenDiamonds([diamond(100, 'Pagamento ok?')]) as unknown as Array<{ x: number; width: number }>
    const needed = diamondMinWidth('Pagamento ok?')
    expect(result.width).toBe(needed)
    expect(result.x + result.width / 2).toBeCloseTo(100 + 50)
  })

  it('leaves a wide enough diamond alone', () => {
    const wide = diamond(500, 'Pagamento ok?')
    expect(widenDiamonds([wide])[0]).toBe(wide)
  })

  it('leaves other shapes and unlabeled diamonds alone', () => {
    const box = { type: 'rectangle', x: 0, y: 0, width: 10, height: 10, label: { text: 'Pagamento ok?' } } as ExcalidrawElementSkeleton
    const bare = { type: 'diamond', x: 0, y: 0, width: 10, height: 10 } as ExcalidrawElementSkeleton
    expect(widenDiamonds([box, bare])).toEqual([box, bare])
  })

  it('does not mutate the input', () => {
    const input = diamond(100, 'Pagamento ok?')
    widenDiamonds([input])
    expect((input as unknown as { width: number }).width).toBe(100)
  })

  it('sizes by the longest word, not the whole label', () => {
    expect(diamondMinWidth('a b c')).toBeLessThan(diamondMinWidth('Pagamento'))
    expect(diamondMinWidth('Pagamento ok?')).toBe(diamondMinWidth('Pagamento'))
  })
})
