import { newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { expand } from './collapse'
import { byId, isLinkOf, mapOfNode, relayout, type CommandResult } from './commands'
import { withBoundEdge } from './elements'
import { branchIds, metaOf, type NodeMeta, type Side } from './model'

function update<T extends ExcalidrawElement>(element: T, changes: Record<string, unknown>): T {
  return newElementWith(element as never, changes as never) as unknown as T
}

const branchIdsOf = (elements: readonly ExcalidrawElement[], nodeId: string) => {
  const map = mapOfNode(elements, nodeId)
  return map ? branchIds(map, nodeId) : []
}

const center = (e: ExcalidrawElement) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

/**
 * The node of the same map under the dragged node's center: never the node itself nor one of its
 * descendants (that would make a cycle). Other maps and empty canvas give null.
 */
export function dropTarget(elements: readonly ExcalidrawElement[], draggedNodeId: string): string | null {
  const map = mapOfNode(elements, draggedNodeId)
  const dragged = byId(elements, draggedNodeId)
  if (!map || !dragged) return null
  const excluded = new Set(branchIds(map, draggedNodeId))
  const point = center(dragged)
  const target = elements.find(
    (e) =>
      !e.isDeleted &&
      map.byId.has(e.id) &&
      !excluded.has(e.id) &&
      point.x >= e.x &&
      point.x <= e.x + e.width &&
      point.y >= e.y &&
      point.y <= e.y + e.height,
  )
  return target?.id ?? null
}

/** Moves a node (with its branch, hidden parts included) under another node of the same map, as its last child. */
export function reparent(original: readonly ExcalidrawElement[], nodeId: string, newParentId: string): CommandResult {
  // Dropped on a collapsed node: expand it, so the moved branch goes after the hidden children.
  const target = byId(original, newParentId)
  const targetMeta = target ? metaOf(target) : null
  const elements = targetMeta?.kind === 'node' && targetMeta.collapsed && !branchIdsOf(original, nodeId).includes(newParentId)
    ? expand(original, newParentId).elements
    : original
  const map = mapOfNode(elements, nodeId)
  const current = map?.byId.get(nodeId)
  const parent = map?.byId.get(newParentId)
  if (!map || !current || !parent || current.parentId === null || branchIds(map, nodeId).includes(newParentId)) {
    return { elements: [...original], select: nodeId }
  }

  const order = parent.children.filter((c) => c.id !== nodeId).reduce((max, c) => Math.max(max, c.order), -1) + 1
  // On the root, the side is where the node was dropped; deeper, it is inherited from the branch.
  let side: Side | null = null
  if (parent.parentId === null) side = center(byId(elements, nodeId)!).x < center(byId(elements, newParentId)!).x ? 'left' : 'right'

  const link = elements.find((e) => !e.isDeleted && isLinkOf(e, new Set([nodeId])) === nodeId)
  const oldParentId = current.parentId
  const next = elements.map((e) => {
    if (e.id === nodeId) {
      const meta = metaOf(e) as NodeMeta
      return update(e, { customData: { ...e.customData, rabisco: { ...meta, parentId: newParentId, order, side } } })
    }
    if (link && e.id === link.id) {
      const binding = (e as unknown as { startBinding?: Record<string, unknown> | null }).startBinding
      return update(e, { startBinding: { ...binding, elementId: newParentId } })
    }
    if (link && e.id === oldParentId) {
      return update(e, { boundElements: (e.boundElements ?? []).filter((b) => b.id !== link.id) })
    }
    if (link && e.id === newParentId) return update(withBoundEdge(e, link.id), {})
    return e
  })
  return { elements: relayout(next, map.mapId), select: nodeId }
}
