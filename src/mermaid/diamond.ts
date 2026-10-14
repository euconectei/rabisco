import type { ExcalidrawElementSkeleton } from './skeleton'

const DEFAULT_FONT_SIZE = 20
// Average glyph width of the hand-drawn font, relative to the font size.
const GLYPH_WIDTH = 0.6
// A diamond's text area is about half of its width, minus the padding Excalidraw keeps inside it.
const TEXT_AREA_RATIO = 0.5
const PADDING = 10

type Skeleton = ExcalidrawElementSkeleton
type Sized = Skeleton & { width?: number; x?: number; label?: { text?: string | null; fontSize?: number } }

/** Width a diamond needs so that the longest word of its label fits on one line. */
export function diamondMinWidth(text: string, fontSize = DEFAULT_FONT_SIZE): number {
  const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0)
  return Math.ceil((longest * fontSize * GLYPH_WIDTH + PADDING) / TEXT_AREA_RATIO)
}

/**
 * Widens diamonds (around their centre) before the skeletons become elements, so a label like
 * "Pagamento ok?" is not broken in the middle of a word. Arrows bound to the diamond are
 * recomputed from the bindings by the conversion. Does not mutate its input.
 */
export function widenDiamonds(skeletons: readonly Skeleton[]): Skeleton[] {
  return skeletons.map((skeleton) => {
    const item = skeleton as Sized
    if (item.type !== 'diamond' || typeof item.width !== 'number' || typeof item.x !== 'number') return skeleton
    const text = item.label?.text
    if (!text) return skeleton
    const needed = diamondMinWidth(text, item.label?.fontSize)
    if (item.width >= needed) return skeleton
    return { ...item, x: item.x - (needed - item.width) / 2, width: needed } as Skeleton
  })
}
