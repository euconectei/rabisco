import { colorForBranch, MINDMAP_PALETTE, ROOT_COLOR } from './colors'

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

it('has eight distinct, readable colors and cycles through them', () => {
  expect(new Set(MINDMAP_PALETTE).size).toBe(8)
  expect(colorForBranch(0)).toBe(MINDMAP_PALETTE[0])
  expect(colorForBranch(8)).toBe(MINDMAP_PALETTE[0])
  expect(colorForBranch(9)).toBe(MINDMAP_PALETTE[1])
  for (const color of [...MINDMAP_PALETTE, ROOT_COLOR]) expect(luminance(color)).toBeLessThan(0.6)
})
