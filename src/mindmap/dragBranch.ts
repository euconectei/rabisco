import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { Point } from './layout'
import { metaOf } from './model'

/**
 * The spike treats a map as "free layout" through a test-only key; Tarefa 4 swaps this for the real
 * `layout` field on the root. Outside the E2E build (or without the flag) this is false and dragging
 * keeps the current "both sides" behavior.
 */
export function isFreeLayout(): boolean {
  if (import.meta.env.VITE_E2E !== '1') return false
  return window.__rabiscoFreeLayout === true
}

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
