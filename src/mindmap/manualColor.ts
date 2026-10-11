import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { metaOf, readMaps, styleOf, type NodeMeta } from './model'

/**
 * Tells hand-picked node colors apart from the ones Rabisco applied (spec 5.5). In boxes style, a
 * node whose stroke or background differs from its appliedColor was painted by hand and becomes
 * manual (colorAuto: false), so relayout keeps its color. A manual node whose colors are back to
 * appliedColor (e.g. the color change was undone) becomes automatic again. Lines style is skipped:
 * there the nodes are transparent by design. Returns the same array when nothing changes.
 */
export function markManualColors(elements: readonly ExcalidrawElement[]): readonly ExcalidrawElement[] {
  const boxesNodes = new Set<string>()
  for (const [mapId, map] of readMaps(elements)) {
    if (styleOf(elements, mapId) === 'boxes') for (const id of map.byId.keys()) boxesNodes.add(id)
  }
  let changed = false
  const next = elements.map((e) => {
    if (e.isDeleted || !boxesNodes.has(e.id)) return e
    const meta = metaOf(e) as NodeMeta
    const applied = meta.appliedColor
    if (!applied) return e
    const auto = e.strokeColor === applied.strokeColor && e.backgroundColor === applied.backgroundColor
    if (auto === meta.colorAuto) return e
    changed = true
    return newElementWith(e, { customData: { ...e.customData, rabisco: { ...meta, colorAuto: auto } } } as never)
  })
  return changed ? next : elements
}
