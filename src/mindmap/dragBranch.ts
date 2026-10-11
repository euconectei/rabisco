import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { Point } from './layout'
import { isOwnBadge } from './collapse'
import { metaOf, type BadgeMeta } from './model'

/** The topmost node under a scene point, or null when the point is not over a node. */
export function nodeAtPoint(elements: readonly ExcalidrawElement[], point: Point): string | null {
  let found: string | null = null
  for (const element of elements) {
    if (element.isDeleted || metaOf(element)?.kind !== 'node') continue
    const inside =
      point.x >= element.x && point.x <= element.x + element.width && point.y >= element.y && point.y <= element.y + element.height
    if (inside) found = element.id
  }
  return found
}

/** The node whose own "+N" badge is under a scene point, or null (a copy of a badge is plain text). */
export function badgeNodeAtPoint(elements: readonly ExcalidrawElement[], point: Point): string | null {
  for (const element of elements) {
    if (element.isDeleted || metaOf(element)?.kind !== 'badge') continue
    const inside =
      point.x >= element.x && point.x <= element.x + element.width && point.y >= element.y && point.y <= element.y + element.height
    if (inside && isOwnBadge(elements, element)) return (metaOf(element) as BadgeMeta).nodeId
  }
  return null
}
