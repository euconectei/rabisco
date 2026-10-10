import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { relayout, type CommandResult } from './commands'
import { ROOT_COLOR } from './colors'
import { createEdgeElement, withBoundEdge } from './elements'
import { layoutOf, metaOf, readMaps, styleOf, type MapLayout, type MapStyle, type MindMap, type NodeMeta } from './model'

function update<T extends ExcalidrawElement>(element: T, changes: Record<string, unknown>): T {
  return newElementWith(element as never, changes as never) as unknown as T
}

/** The root meta of a map, stamped with the given layout/style. */
function stampRoot(elements: readonly ExcalidrawElement[], map: MindMap, changes: Partial<NodeMeta>): ExcalidrawElement[] {
  return elements.map((e) => {
    if (e.id !== map.root.id) return e
    const meta = metaOf(e) as NodeMeta
    return update(e, { customData: { ...e.customData, rabisco: { ...meta, ...changes } } })
  })
}

/**
 * Rebuilds a map's links for the boxes style: drops the lines-style underlines, knobs and loose
 * curved lines, and creates a bound arrow for each parent → child edge. relayout() then positions
 * them and applies the branch colors.
 */
function boxesLinks(elements: readonly ExcalidrawElement[], map: MindMap): ExcalidrawElement[] {
  const nodes = new Map(elements.filter((e) => map.byId.has(e.id) && !e.isDeleted).map((e) => [e.id, e]))
  const edges: ExcalidrawElement[] = []
  const extraBound = new Map<string, string[]>()
  for (const treeNode of map.byId.values()) {
    if (treeNode.parentId === null) continue
    const parent = nodes.get(treeNode.parentId)
    const child = nodes.get(treeNode.id)
    if (!parent || !child) continue
    const edge = createEdgeElement({ mapId: map.mapId, parent, child, color: ROOT_COLOR })
    edges.push(edge)
    for (const id of [parent.id, child.id]) extraBound.set(id, [...(extraBound.get(id) ?? []), edge.id])
  }
  // Old links and decorations are marked deleted (not dropped), like every other removal, so the
  // scene keeps them for undo; elements deleted earlier stay in the scene for the same reason.
  const kept = elements.map((e) => {
    if (e.isDeleted) return e
    const meta = metaOf(e)
    const stale = meta?.mapId === map.mapId && (meta.kind === 'edge' || meta.kind === 'underline' || meta.kind === 'knob')
    return stale ? update(e, { isDeleted: true }) : e
  })
  const bound = kept.map((e) => (e.isDeleted ? e : (extraBound.get(e.id) ?? []).reduce((node, edgeId) => withBoundEdge(node, edgeId), e)))
  // Links go first so they are drawn under the nodes.
  return [...edges, ...bound]
}

/**
 * Switches one map between the boxes and lines styles. Boxes → lines remembers the box colors of
 * manually-colored nodes in boxColors (so they survive the round trip) and makes the nodes
 * transparent; lines → boxes restores them and binds arrows to the nodes again. One CommandResult,
 * one undo step.
 */
export function setStyle(elements: readonly ExcalidrawElement[], mapId: string, style: MapStyle): CommandResult {
  const map = readMaps(elements).get(mapId)
  if (!map) return { elements: [...elements], select: null }
  const current = styleOf(elements, mapId)
  if (current === style) return { elements: [...elements], select: map.root.id }

  // Going into lines style: capture the box colors before the nodes turn transparent, so coming
  // back to boxes restores them. Auto-colored nodes have nothing to remember.
  let next = elements
  if (style === 'lines') {
    next = elements.map((e) => {
      if (!map.byId.has(e.id) || e.isDeleted) return e
      const meta = metaOf(e) as NodeMeta
      if (meta.colorAuto) return e
      return update(e, {
        customData: { ...e.customData, rabisco: { ...meta, boxColors: { strokeColor: e.strokeColor, backgroundColor: e.backgroundColor } } },
      })
    })
  }

  const styled = stampRoot(next, map, { style })
  const rebuilt = style === 'boxes' ? boxesLinks(styled, map) : styled
  return { elements: relayout(rebuilt, mapId), select: map.root.id }
}

/**
 * Switches one map's organization. Free keeps the nodes where they are; the automatic layouts
 * re-derive their positions. One CommandResult, one undo step.
 */
export function setLayout(elements: readonly ExcalidrawElement[], mapId: string, layout: MapLayout): CommandResult {
  const map = readMaps(elements).get(mapId)
  if (!map) return { elements: [...elements], select: null }
  if (layoutOf(elements, mapId) === layout) return { elements: [...elements], select: map.root.id }
  return { elements: relayout(stampRoot(elements, map, { layout }), mapId), select: map.root.id }
}
