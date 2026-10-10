import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { colorForBranch, ROOT_COLOR } from './colors'
import { createEdgeElement, createNodeElements, newId, nodeSize, withBoundEdge } from './elements'
import { assignedSides, layoutMap, LEVEL_GAP, SIBLING_GAP, type Point, type Size } from './layout'
import { createKnob, createLineEdge, createUnderline, knobGeometry, lineSiblingGap, LINE_NODE_PADDING_X, LINE_NODE_PADDING_Y, lineEdgeGeometry, underlineGeometry } from './lines'
import { branchIds, hiddenCount, layoutOf, metaOf, readMaps, sideOf, styleOf, type MapStyle, type MindMap, type NodeMeta, type Side } from './model'

export interface CommandResult {
  elements: ExcalidrawElement[]
  /** Element to select after the command (null: clear the selection). */
  select: string | null
}

export type NavigationKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'

type Mutable = ExcalidrawElement & { containerId?: string | null }

function update<T extends ExcalidrawElement>(element: T, changes: Record<string, unknown>): T {
  return newElementWith(element as never, changes as never) as unknown as T
}

function withMeta(element: ExcalidrawElement, changes: Partial<NodeMeta>): ExcalidrawElement {
  const meta = metaOf(element) as NodeMeta
  return update(element, { customData: { ...element.customData, rabisco: { ...meta, ...changes } } })
}

export function mapOfNode(elements: readonly ExcalidrawElement[], nodeId: string): MindMap | null {
  for (const map of readMaps(elements).values()) if (map.byId.has(nodeId)) return map
  return null
}

const BADGE_GAP = 8

// A new (non-root) node's footprint, matching createNodeElements: used to find a clear spot for a
// child in the free layout.
const CHILD_NODE_SIZE: Size = { width: 140, height: 44 }

export const byId = (elements: readonly ExcalidrawElement[], id: string) => elements.find((e) => e.id === id)

/**
 * A map link must really end at the child its metadata names. Copies (Ctrl+D, copy/paste, edits on
 * excalidraw.com) keep the original customData but Excalidraw binds them to the copied nodes, so in
 * boxes style they are treated as plain arrows instead of hijacking the original map's links. In lines
 * style the link is not bound at all, so the customData alone identifies it (duplicates are handled by
 * dedupeLinksAndDecorations).
 */
export function isLinkOf(element: ExcalidrawElement, childIds: ReadonlySet<string>, style: MapStyle): string | null {
  const meta = metaOf(element)
  if (meta?.kind !== 'edge' || !childIds.has(meta.childId)) return null
  if (style === 'boxes') {
    const end = (element as unknown as { endBinding?: { elementId?: string } | null }).endBinding?.elementId
    return end === meta.childId ? meta.childId : null
  }
  return meta.childId
}

/** The node a lines-style decoration (underline/knob) belongs to, when that node is in the given set. */
export function isDecorationOf(element: ExcalidrawElement, nodeIds: ReadonlySet<string>): string | null {
  const meta = metaOf(element)
  if ((meta?.kind !== 'underline' && meta?.kind !== 'knob') || !nodeIds.has(meta.nodeId)) return null
  return meta.nodeId
}

/**
 * Copy/paste keeps customData but duplicates it: for each (mapId, childId) link and (mapId, nodeId)
 * decoration the first element in scene order is the real one; the rest lose customData.rabisco and
 * become plain drawing elements. Keeps duplicated links/decoration from hijacking a map's structure.
 */
export function dedupeLinksAndDecorations(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const element of elements) {
    if (element.isDeleted) continue
    const meta = metaOf(element)
    let key: string | null = null
    if (meta?.kind === 'edge') key = `edge\u0000${meta.mapId}\u0000${meta.childId}`
    else if (meta?.kind === 'underline') key = `underline\u0000${meta.mapId}\u0000${meta.nodeId}`
    else if (meta?.kind === 'knob') key = `knob\u0000${meta.mapId}\u0000${meta.nodeId}`
    if (key === null) continue
    if (seen.has(key)) duplicates.add(element.id)
    else seen.add(key)
  }
  if (duplicates.size === 0) return [...elements]
  return elements.map((element) => {
    if (!duplicates.has(element.id)) return element
    const customData = { ...element.customData } as Record<string, unknown>
    delete customData.rabisco
    return update(element, { customData })
  })
}

export function createMap(elements: readonly ExcalidrawElement[], at: Point, rootText: string): CommandResult {
  const mapId = newId()
  const created = createNodeElements({ mapId, parentId: null, order: 0, side: null, text: rootText, x: at.x - 90, y: at.y - 28, color: ROOT_COLOR, isRoot: true })
  return { elements: [...elements, ...created], select: created[0].id }
}

/**
 * Where a new child goes in the free layout: just outside the parent (on the branch side for maps
 * that came from both sides, otherwise to the right), right below the last sibling, descending until
 * the spot is clear of every other node of the map.
 */
export function freeChildPosition(elements: readonly ExcalidrawElement[], map: MindMap, parentId: string, side: Side | null): Point {
  const parent = byId(elements, parentId)!
  const left = (side ?? sideOf(map, parentId)) === 'left'
  const { width, height } = CHILD_NODE_SIZE
  const x = left ? parent.x - LEVEL_GAP - width : parent.x + parent.width + LEVEL_GAP
  let y = parent.y
  for (const child of map.byId.get(parentId)?.children ?? []) {
    const rect = byId(elements, child.id)
    if (rect) y = Math.max(y, rect.y + rect.height + SIBLING_GAP)
  }
  const nodes = elements.filter((e) => !e.isDeleted && map.byId.has(e.id))
  const overlaps = (candidate: Point) =>
    nodes.some((e) => candidate.x < e.x + e.width && e.x < candidate.x + width && candidate.y < e.y + e.height && e.y < candidate.y + height)
  while (overlaps({ x, y })) y += height
  return { x, y }
}

function insertChild(elements: readonly ExcalidrawElement[], map: MindMap, parentId: string, order: number, side: Side | null, text: string): CommandResult {
  const parent = byId(elements, parentId)!
  // Free layout keeps nodes where they are placed: the new child goes beside the parent (below the
  // last sibling), not through the automatic layout.
  const position =
    layoutOf(elements, map.mapId) === 'free'
      ? freeChildPosition(elements, map, parentId, side)
      : { x: parent.x + parent.width + LEVEL_GAP, y: parent.y }
  const created = createNodeElements({ mapId: map.mapId, parentId, order, side, text, x: position.x, y: position.y, color: ROOT_COLOR, isRoot: false, style: styleOf(elements, map.mapId) })
  const edge = createEdgeElement({ mapId: map.mapId, parent, child: created[0], color: ROOT_COLOR })
  const [childRect, ...childRest] = created
  const linked = elements.map((e) => (e.id === parentId ? update(withBoundEdge(e, edge.id), {}) : e))
  // Links go first so they are drawn under the nodes.
  return {
    elements: relayout([edge, ...linked, withBoundEdge(childRect, edge.id), ...childRest], map.mapId),
    select: childRect.id,
  }
}

export function addChild(elements: readonly ExcalidrawElement[], nodeId: string, text: string): CommandResult {
  const map = mapOfNode(elements, nodeId)
  if (!map) return { elements: [...elements], select: nodeId }
  const parent = map.byId.get(nodeId)!
  const order = parent.children.reduce((max, child) => Math.max(max, child.order), -1) + 1
  return insertChild(elements, map, nodeId, order, null, text)
}

export function addSibling(elements: readonly ExcalidrawElement[], nodeId: string, text: string): CommandResult {
  const map = mapOfNode(elements, nodeId)
  if (!map) return { elements: [...elements], select: nodeId }
  const current = map.byId.get(nodeId)!
  if (current.parentId === null) return addChild(elements, nodeId, text)
  const later = new Set(map.byId.get(current.parentId)!.children.filter((s) => s.order > current.order).map((s) => s.id))
  const shifted = elements.map((e) => (later.has(e.id) ? withMeta(e, { order: (metaOf(e) as NodeMeta).order + 1 }) : e))
  const side = current.depth === 1 ? sideOf(map, nodeId) : null
  return insertChild(shifted, map, current.parentId, current.order + 1, side, text)
}

/**
 * Every element of a branch: its nodes, their texts, their links (including the link to the parent)
 * and, in lines style, their underlines and knobs. Rabisco selects these and lets Excalidraw delete
 * them, so its own undo restores them.
 */
export function branchElementIds(elements: readonly ExcalidrawElement[], nodeId: string): string[] {
  const deduped = dedupeLinksAndDecorations(elements)
  const map = mapOfNode(deduped, nodeId)
  if (!map) return []
  const style = styleOf(deduped, map.mapId)
  const ids = new Set(branchIds(map, nodeId))
  // Only the nodes' own badges: a pasted copy of a badge is a plain text elsewhere on the canvas.
  const badgeIds = new Set(
    deduped.flatMap((e) => {
      const meta = ids.has(e.id) ? metaOf(e) : null
      return meta?.kind === 'node' && meta.badgeId ? [meta.badgeId] : []
    }),
  )
  return deduped
    .filter((e) => {
      if (e.isDeleted) return false
      const container = (e as Mutable).containerId
      const badge = badgeIds.has(e.id)
      return ids.has(e.id) || (container != null && ids.has(container)) || isLinkOf(e, ids, style) !== null || isDecorationOf(e, ids) !== null || badge
    })
    .map((e) => e.id)
}

export function navigate(elements: readonly ExcalidrawElement[], nodeId: string, key: NavigationKey): string | null {
  const map = mapOfNode(elements, nodeId)
  if (!map) return null
  const current = map.byId.get(nodeId)!
  const layout = layoutOf(elements, map.mapId)
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    if (current.parentId === null) return null
    const siblings = map.byId.get(current.parentId)!.children
    const sameSide = current.depth === 1 && layout === 'both' ? siblings.filter((s) => sideOf(map, s.id) === sideOf(map, nodeId)) : siblings
    const index = sameSide.findIndex((s) => s.id === nodeId)
    return sameSide[index + (key === 'ArrowDown' ? 1 : -1)]?.id ?? null
  }
  // In 'right' and 'free' the side has no visual meaning: → is the first child, ← the parent.
  if (layout !== 'both') return key === 'ArrowRight' ? (current.children[0]?.id ?? null) : current.parentId
  if (current.parentId === null) {
    const want: Side = key === 'ArrowRight' ? 'right' : 'left'
    return current.children.find((child) => sideOf(map, child.id) === want)?.id ?? null
  }
  const side = sideOf(map, nodeId)
  const outward = (side === 'right') === (key === 'ArrowRight')
  return outward ? (current.children[0]?.id ?? null) : current.parentId
}

/** Re-positions and re-colors one map. Elements outside that map keep their identity. */
// relayout and layoutDrift must space siblings alike, or a lines-style map always looks drifted and
// the heal re-lays it out forever.
const siblingGapFor = (style: MapStyle): number => (style === 'lines' ? lineSiblingGap() : SIBLING_GAP)

export function relayout(elements: readonly ExcalidrawElement[], mapId: string): ExcalidrawElement[] {
  const deduped = dedupeLinksAndDecorations(elements)
  const map = readMaps(deduped).get(mapId)
  if (!map) return [...deduped]
  const style = styleOf(deduped, mapId)
  const layout = layoutOf(deduped, mapId)
  const textByContainer = new Map<string, ExcalidrawElement>()
  for (const e of deduped) {
    const container = (e as Mutable).containerId
    if (container && !e.isDeleted) textByContainer.set(container, e)
  }
  const rects = new Map(deduped.filter((e) => map.byId.has(e.id)).map((e) => [e.id, e]))
  // In lines style the node is only a bit larger than its text, so its size comes from the bound text.
  const linesSize = (e: ExcalidrawElement): Size => {
    const text = textByContainer.get(e.id)
    return { width: (text?.width ?? 0) + LINE_NODE_PADDING_X * 2, height: (text?.height ?? 0) + LINE_NODE_PADDING_Y * 2 }
  }
  const sizes = new Map<string, Size>([...rects].map(([id, e]) => [id, style === 'lines' ? linesSize(e) : nodeSize(e)]))
  const root = rects.get(map.root.id)!
  // Free layout keeps nodes where the user put them (positions come from the scene). The automatic
  // layouts re-derive positions; lines style spaces siblings further apart (24 px).
  const positions =
    layout === 'free'
      ? new Map([...rects].map(([id, e]) => [id, { x: e.x, y: e.y }]))
      : layoutMap(map, sizes, { x: root.x, y: root.y }, { layout, siblingGap: siblingGapFor(style) })
  // Only 'both' persists the side each first-level branch landed on; 'right' ignores (but keeps) it
  // and 'free' never touches it.
  const sides = layout === 'both' ? assignedSides(map, positions) : null

  const branchColor = new Map<string, string>([[map.root.id, ROOT_COLOR]])
  map.root.children.forEach((child, index) => {
    const color = colorForBranch(index)
    const stack = [child]
    while (stack.length) {
      const current = stack.pop()!
      branchColor.set(current.id, color)
      stack.push(...current.children)
    }
  })

  const mapNodeIds = new Set(map.byId.keys())
  // The color each node (and its decorations/links) uses: the branch color, or the manually chosen one.
  const nodeColor = new Map<string, string>()
  const moved = new Map<string, { dx: number; dy: number; rect: ExcalidrawElement }>()
  const next = deduped.map((e) => {
    if (!map.byId.has(e.id) || e.isDeleted) return e
    const meta = metaOf(e) as NodeMeta
    const position = positions.get(e.id)!
    // Manual colors come from boxColors when present (captured when switching to lines style), so a
    // hand-picked color survives the round trip and tints the lines-style decorations too.
    const color = meta.colorAuto ? branchColor.get(e.id)! : (meta.boxColors?.strokeColor ?? e.strokeColor)
    nodeColor.set(e.id, color)
    const side = sides?.get(e.id) ?? meta.side
    const updated =
      style === 'lines'
        ? update(e, {
            x: position.x,
            y: position.y,
            width: sizes.get(e.id)!.width,
            height: sizes.get(e.id)!.height,
            strokeColor: 'transparent',
            backgroundColor: 'transparent',
            boundElements: (e.boundElements ?? []).filter((b) => b.type !== 'arrow'),
            customData: { ...e.customData, rabisco: { ...meta, side } },
          })
        : update(e, {
            x: position.x,
            y: position.y,
            strokeColor: color,
            backgroundColor: meta.colorAuto ? e.backgroundColor : (meta.boxColors?.backgroundColor ?? e.backgroundColor),
            customData: { ...e.customData, rabisco: { ...meta, side } },
          })
    moved.set(e.id, { dx: position.x - e.x, dy: position.y - e.y, rect: updated })
    return updated
  })

  const positioned = next.map((e) => {
    if (e.isDeleted) return e
    const meta = metaOf(e)
    if (meta?.kind === 'badge') {
      const owner = moved.get(meta.nodeId)?.rect
      if (!owner || (metaOf(owner) as NodeMeta).badgeId !== e.id) return e
      const { rect } = moved.get(meta.nodeId)!
      const right = sideOf(map, meta.nodeId) !== 'left'
      // In lines style the badge sits beside the knob, i.e. at the underline level.
      const y = style === 'lines' ? rect.y + rect.height - e.height / 2 : rect.y + rect.height / 2 - e.height / 2
      return update(e, {
        x: right ? rect.x + rect.width + BADGE_GAP : rect.x - e.width - BADGE_GAP,
        y,
        strokeColor: rect.strokeColor,
      })
    }
    const container = (e as Mutable).containerId
    if (container && moved.has(container)) {
      const { rect } = moved.get(container)!
      if (style === 'lines') {
        return update(e, { x: rect.x + LINE_NODE_PADDING_X, y: rect.y + LINE_NODE_PADDING_Y, textAlign: 'left' })
      }
      const { dx, dy } = moved.get(container)!
      return dx || dy ? update(e, { x: e.x + dx, y: e.y + dy }) : e
    }
    // Lines-style links are loose curved lines recomputed separately (see below), not repositioned here.
    if (style !== 'boxes') return e
    const childId = isLinkOf(e, mapNodeIds, style)
    if (!childId || childId === map.root.id) return e
    const child = moved.get(childId)!.rect
    const parent = moved.get(map.byId.get(childId)!.parentId!)!.rect
    // In 'right' (and 'free') the stored side is not the visual side, so use the actual position.
    const right = layout === 'both' ? sideOf(map, childId) !== 'left' : child.x >= parent.x + parent.width
    const start = { x: right ? parent.x + parent.width : parent.x, y: parent.y + parent.height / 2 }
    const end = { x: right ? child.x : child.x + child.width, y: child.y + child.height / 2 }
    const dx = end.x - start.x
    const dy = end.y - start.y
    return update(e, {
      x: start.x,
      y: start.y,
      width: Math.abs(dx),
      height: Math.abs(dy),
      points: [
        [0, 0],
        [dx, dy],
      ],
      strokeColor: branchColor.get(childId) ?? e.strokeColor,
    })
  })

  if (style !== 'lines') return positioned
  // Lines style: rebuild the derived links/decorations from the moved nodes, keeping the ids of the
  // ones already there (collapse/expand restore them by id) and dropping bound arrows left by boxes.
  const existingByKey = new Map<string, ExcalidrawElement>()
  for (const e of positioned) {
    if (e.isDeleted) continue
    const m = metaOf(e)
    if (!m || m.mapId !== mapId) continue
    const bound = (e as unknown as { endBinding?: { elementId?: string } | null }).endBinding?.elementId
    if (m.kind === 'underline' || m.kind === 'knob') {
      const key = `${m.kind}\u0000${m.mapId}\u0000${m.nodeId}`
      if (!existingByKey.has(key)) existingByKey.set(key, e)
    } else if (m.kind === 'edge' && !bound) {
      const key = `edge\u0000${m.mapId}\u0000${m.childId}`
      if (!existingByKey.has(key)) existingByKey.set(key, e)
    }
  }
  const derived: ExcalidrawElement[] = []
  const nodes = new Map([...moved].map(([id, m]) => [id, m.rect]))
  const knobSide = (nodeId: string): Side => (layout === 'right' ? 'right' : sideOf(map, nodeId) ?? 'right')
  const covered = new Set<string>()
  for (const treeNode of map.byId.values()) {
    const node = nodes.get(treeNode.id)!
    const nodeMeta = metaOf(node) as NodeMeta
    const color = nodeColor.get(treeNode.id)!
    if (treeNode.id !== map.root.id) {
      const key = `underline\u0000${mapId}\u0000${treeNode.id}`
      covered.add(key)
      const existing = existingByKey.get(key)
      derived.push(existing ? update(existing, { ...underlineGeometry(node), strokeColor: color }) : createUnderline(node, color, mapId))
      if (treeNode.children.length > 0 || hiddenCount(nodeMeta) > 0) {
        const knobKey = `knob\u0000${mapId}\u0000${treeNode.id}`
        covered.add(knobKey)
        const side = knobSide(treeNode.id)
        const existingKnob = existingByKey.get(knobKey)
        derived.push(existingKnob ? update(existingKnob, { ...knobGeometry(node, side), strokeColor: color }) : createKnob(node, color, mapId, side, true)!)
      }
    }
    for (const child of treeNode.children) {
      const key = `edge\u0000${mapId}\u0000${child.id}`
      covered.add(key)
      const childNode = nodes.get(child.id)!
      const existingEdge = existingByKey.get(key)
      derived.push(existingEdge ? update(existingEdge, { ...lineEdgeGeometry(node, childNode), strokeColor: nodeColor.get(child.id)! }) : createLineEdge(mapId, node, childNode, nodeColor.get(child.id)!))
    }
  }
  // Keep extra underlines/knobs already in the scene (e.g. a knob on a leaf left by an external edit),
  // re-anchoring them to their node; orphans and bound arrows are dropped.
  for (const e of positioned) {
    if (e.isDeleted) continue
    const m = metaOf(e)
    if (!m || m.mapId !== mapId || (m.kind !== 'underline' && m.kind !== 'knob')) continue
    const key = `${m.kind}\u0000${m.mapId}\u0000${m.nodeId}`
    if (covered.has(key)) continue
    const node = nodes.get(m.nodeId)
    if (!node) continue
    const color = nodeColor.get(m.nodeId) ?? e.strokeColor
    derived.push(m.kind === 'underline' ? update(e, { ...underlineGeometry(node), strokeColor: color }) : update(e, { ...knobGeometry(node, knobSide(m.nodeId)), strokeColor: color }))
  }
  const kept = positioned.filter((e) => {
    const m = metaOf(e)
    return !m || m.mapId !== mapId || (m.kind !== 'edge' && m.kind !== 'underline' && m.kind !== 'knob')
  })
  return [...derived, ...kept]
}

/** Whether a map's nodes are away from where the layout puts them (undo, redo, paste, external edits). */
export function layoutDrift(elements: readonly ExcalidrawElement[], mapId: string): boolean {
  const map = readMaps(elements).get(mapId)
  if (!map) return false
  const layout = layoutOf(elements, mapId)
  // Free maps keep the user's positions, so nothing can "drift" (Tarefa 4 formalizes the layout).
  if (layout === 'free') return false
  const rects = new Map(elements.filter((e) => map.byId.has(e.id) && !e.isDeleted).map((e) => [e.id, e]))
  const root = rects.get(map.root.id)
  if (!root) return false
  const positions = layoutMap(map, new Map([...rects].map(([id, e]) => [id, nodeSize(e)])), { x: root.x, y: root.y }, { layout, siblingGap: siblingGapFor(styleOf(elements, mapId)) })
  for (const [id, position] of positions) {
    const current = rects.get(id)
    if (current && (Math.abs(current.x - position.x) > 0.5 || Math.abs(current.y - position.y) > 0.5)) return true
  }
  return false
}

/** The map node behind the current selection: exactly one node (its own text may be selected too). */
export function findNodeOf(elements: readonly ExcalidrawElement[], selectedIds: readonly string[]): { mapId: string; nodeId: string } | null {
  if (selectedIds.length === 0) return null
  const selected = selectedIds.map((id) => byId(elements, id)).filter((e): e is ExcalidrawElement => !!e && !e.isDeleted)
  const containers = new Set(selected.map((e) => (metaOf(e)?.kind === 'node' ? e.id : ((e as Mutable).containerId ?? e.id))))
  if (containers.size !== 1) return null
  const [id] = containers
  const element = byId(elements, id)
  const meta = element ? metaOf(element) : null
  if (meta?.kind !== 'node' || !readMaps(elements).get(meta.mapId)?.byId.has(id)) return null
  return { mapId: meta.mapId, nodeId: id }
}
