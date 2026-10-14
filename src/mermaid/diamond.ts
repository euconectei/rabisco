import type { ExcalidrawElementSkeleton } from './skeleton'

const DEFAULT_FONT_SIZE = 20
// Average glyph width of the hand-drawn font, relative to the font size.
const GLYPH_WIDTH = 0.6
// A diamond's text area is about half of its width, an ellipse's about 70%, minus the padding Excalidraw keeps inside.
const TEXT_AREA_RATIO = { diamond: 0.5, ellipse: Math.SQRT1_2 } as const
const PADDING = 10

type Skeleton = ExcalidrawElementSkeleton
type Sized = Skeleton & { width?: number; x?: number; label?: { text?: string | null; fontSize?: number } }

/** Width a diamond needs so that the longest word of its label fits on one line. */
export function diamondMinWidth(text: string, fontSize = DEFAULT_FONT_SIZE, shape: 'diamond' | 'ellipse' = 'diamond'): number {
  const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0)
  return Math.ceil((longest * fontSize * GLYPH_WIDTH + PADDING) / (shape === 'ellipse' ? TEXT_AREA_RATIO.ellipse : TEXT_AREA_RATIO.diamond))
}

/**
 * Widens diamonds and ellipses (around their centre) before the skeletons become elements, so a label
 * like "Pagamento ok?" is not broken in the middle of a word. A circle stays a circle. Arrows bound to
 * the shape are recomputed from the bindings by the conversion. Does not mutate its input.
 */
export function widenDiamonds(skeletons: readonly Skeleton[]): Skeleton[] {
  return skeletons.map((skeleton) => {
    const item = skeleton as Sized
    if ((item.type !== 'diamond' && item.type !== 'ellipse') || typeof item.width !== 'number' || typeof item.x !== 'number') return skeleton
    const text = item.label?.text
    if (!text) return skeleton
    const needed = diamondMinWidth(text, item.label?.fontSize, item.type)
    if (item.width >= needed) return skeleton
    const grown: Record<string, number> = { x: item.x - (needed - item.width) / 2, width: needed }
    const height = (item as { height?: number }).height
    const y = (item as { y?: number }).y
    if (item.type === 'ellipse' && typeof height === 'number' && typeof y === 'number' && Math.abs(height - item.width) < 1) {
      grown.height = needed
      grown.y = y - (needed - height) / 2
    }
    return { ...item, ...grown } as Skeleton
  })
}
