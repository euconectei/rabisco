import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/** Left, top, right, bottom of an element; for lines and arrows the real points, which can be negative. */
function extent(element: ExcalidrawElement): [number, number, number, number] {
  const points = (element as { points?: ReadonlyArray<readonly [number, number]> }).points
  if (!points || points.length === 0) return [element.x, element.y, element.x + element.width, element.y + element.height]
  const xs = points.map((point) => element.x + point[0])
  const ys = points.map((point) => element.y + point[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

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
    const [left, top, right, bottom] = extent(element)
    minX = Math.min(minX, left)
    minY = Math.min(minY, top)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)
  }
  const dx = center.x - (minX + maxX) / 2
  const dy = center.y - (minY + maxY) / 2
  return elements.map((element) => ({ ...element, x: element.x + dx, y: element.y + dy }))
}
