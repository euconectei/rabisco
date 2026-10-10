// Excalidraw stroke tones that read well on both light and dark canvases.
export const MINDMAP_PALETTE = ['#1971c2', '#e8590c', '#2f9e44', '#9c36b5', '#f08c00', '#0c8599', '#e03131', '#5c940d'] as const
export const ROOT_COLOR = '#1e1e1e'

/** Color of the n-th first-level branch; descendants inherit their branch color. */
export function colorForBranch(index: number): string {
  return MINDMAP_PALETTE[((index % MINDMAP_PALETTE.length) + MINDMAP_PALETTE.length) % MINDMAP_PALETTE.length]
}
