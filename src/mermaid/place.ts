import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/**
 * Moves a group of elements so that the centre of their bounding box lands on `center`. Arrow points
 * and bound text are relative to their element or move with it, so shifting x and y is enough.
 */
export function centerOn(elements: readonly ExcalidrawElement[], center: { x: number; y: number }): ExcalidrawElement[] {
  if (elements.length === 0) return []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const element of elements) {
    minX = Math.min(minX, element.x)
    minY = Math.min(minY, element.y)
    maxX = Math.max(maxX, element.x + element.width)
    maxY = Math.max(maxY, element.y + element.height)
  }
  const dx = center.x - (minX + maxX) / 2
  const dy = center.y - (minY + maxY) / 2
  return elements.map((element) => ({ ...element, x: element.x + dx, y: element.y + dy }))
}
