import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { colorForBranch, ROOT_COLOR } from './colors'
import { createEdgeElement, createNodeElements, newId, nodeSize, withBoundEdge } from './elements'
import { assignedSides, layoutMap, type Point, type Size } from './layout'
import { branchIds, metaOf, readMaps, sideOf, type MindMap, type NodeMeta, type Side } from './model'

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

function mapOfNode(elements: readonly ExcalidrawElement[], nodeId: string): MindMap | null {
  for (const map of readMaps(elements).values()) if (map.byId.has(nodeId)) return map
  return null
}

const byId = (elements: readonly ExcalidrawElement[], id: string) => elements.find((e) => e.id === id)

export function createMap(elements: readonly ExcalidrawElement[], at: Point, rootText: string): CommandResult {
  const mapId = newId()
  const created = createNodeElements({ mapId, parentId: null, order: 0, side: null, text: rootText, x: at.x - 90, y: at.y - 28, color: ROOT_COLOR, isRoot: true })
  return { elements: [...elements, ...created], select: created[0].id }
}

function insertChild(elements: readonly ExcalidrawElement[], map: MindMap, parentId: string, order: number, side: Side | null, text: string): CommandResult {
  const parent = byId(elements, parentId)!
  const created = createNodeElements({ mapId: map.mapId, parentId, order, side, text, x: parent.x + parent.width + 80, y: parent.y, color: ROOT_COLOR, isRoot: false })
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

export function deleteBranch(elements: readonly ExcalidrawElement[], nodeId: string): CommandResult {
  const map = mapOfNode(elements, nodeId)
  if (!map) return { elements: [...elements], select: null }
  const ids = new Set(branchIds(map, nodeId))
  const parentId = map.byId.get(nodeId)!.parentId
  const next = elements.map((e) => {
    const meta = metaOf(e)
    const container = (e as Mutable).containerId
    const doomed = ids.has(e.id) || (container != null && ids.has(container)) || (meta?.kind === 'edge' && ids.has(meta.childId))
    return doomed && !e.isDeleted ? update(e, { isDeleted: true }) : e
  })
  return { elements: parentId ? relayout(next, map.mapId) : next, select: parentId }
}

export function navigate(elements: readonly ExcalidrawElement[], nodeId: string, key: NavigationKey): string | null {
  const map = mapOfNode(elements, nodeId)
  if (!map) return null
  const current = map.byId.get(nodeId)!
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    if (current.parentId === null) return null
    const siblings = map.byId.get(current.parentId)!.children
    const sameSide = current.depth === 1 ? siblings.filter((s) => sideOf(map, s.id) === sideOf(map, nodeId)) : siblings
    const index = sameSide.findIndex((s) => s.id === nodeId)
    return sameSide[index + (key === 'ArrowDown' ? 1 : -1)]?.id ?? null
  }
  if (current.parentId === null) {
    const want: Side = key === 'ArrowRight' ? 'right' : 'left'
    return current.children.find((child) => sideOf(map, child.id) === want)?.id ?? null
  }
  const side = sideOf(map, nodeId)
  const outward = (side === 'right') === (key === 'ArrowRight')
  return outward ? (current.children[0]?.id ?? null) : current.parentId
}

/** Re-positions and re-colors one map. Elements outside that map keep their identity. */
export function relayout(elements: readonly ExcalidrawElement[], mapId: string): ExcalidrawElement[] {
  const map = readMaps(elements).get(mapId)
  if (!map) return [...elements]
  const rects = new Map(elements.filter((e) => map.byId.has(e.id)).map((e) => [e.id, e]))
  const sizes = new Map<string, Size>([...rects].map(([id, e]) => [id, nodeSize(e)]))
  const root = rects.get(map.root.id)!
  const positions = layoutMap(map, sizes, { x: root.x, y: root.y })
  const sides = assignedSides(map, positions)

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

  const moved = new Map<string, { dx: number; dy: number; rect: ExcalidrawElement }>()
  const next = elements.map((e) => {
    if (!map.byId.has(e.id) || e.isDeleted) return e
    const meta = metaOf(e) as NodeMeta
    const position = positions.get(e.id)!
    const color = meta.colorAuto ? branchColor.get(e.id)! : e.strokeColor
    const side = sides.get(e.id) ?? meta.side
    const updated = update(e, {
      x: position.x,
      y: position.y,
      strokeColor: color,
      customData: { ...e.customData, rabisco: { ...meta, side } },
    })
    moved.set(e.id, { dx: position.x - e.x, dy: position.y - e.y, rect: updated })
    return updated
  })

  return next.map((e) => {
    if (e.isDeleted) return e
    const container = (e as Mutable).containerId
    if (container && moved.has(container)) {
      const { dx, dy } = moved.get(container)!
      return dx || dy ? update(e, { x: e.x + dx, y: e.y + dy }) : e
    }
    const meta = metaOf(e)
    if (meta?.kind !== 'edge' || meta.mapId !== mapId || !map.byId.has(meta.childId)) return e
    const child = moved.get(meta.childId)!.rect
    const parent = moved.get(map.byId.get(meta.childId)!.parentId!)!.rect
    const right = sideOf(map, meta.childId) !== 'left'
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
      strokeColor: branchColor.get(meta.childId) ?? e.strokeColor,
    })
  })
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
