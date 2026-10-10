import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { byId, isLinkOf, mapOfNode, relayout, type CommandResult } from './commands'
import { newId } from './elements'
import { branchIds, hiddenCount, metaOf, type BadgeMeta, type NodeMeta } from './model'

// Collapsing keeps everything: the descendants' elements (rectangles, texts, links, nested badges)
// are deleted from the scene the way Excalidraw deletes, and full copies ride in the node's
// customData.rabisco.hidden — saved with the file, restored as they were on expand.

type Mutable = ExcalidrawElement & { containerId?: string | null }

function update<T extends ExcalidrawElement>(element: T, changes: Record<string, unknown>): T {
  return newElementWith(element as never, changes as never) as unknown as T
}

export function badgeOf(elements: readonly ExcalidrawElement[], nodeId: string): ExcalidrawElement | undefined {
  return elements.find((e) => {
    const meta = metaOf(e)
    return !e.isDeleted && meta?.kind === 'badge' && meta.nodeId === nodeId
  })
}

function createBadge(node: ExcalidrawElement, mapId: string, count: number): ExcalidrawElement {
  const meta: BadgeMeta = { kind: 'badge', mapId, nodeId: node.id }
  const [badge] = convertToExcalidrawElements(
    [
      {
        type: 'text',
        id: newId(),
        x: node.x + node.width + 8,
        y: node.y + node.height / 2 - 10,
        text: `+${count}`,
        fontSize: 16,
        strokeColor: node.strokeColor,
        customData: { rabisco: meta },
      },
    ],
    { regenerateIds: false },
  )
  return badge as ExcalidrawElement
}

export function collapse(elements: readonly ExcalidrawElement[], nodeId: string): CommandResult {
  const map = mapOfNode(elements, nodeId)
  const treeNode = map?.byId.get(nodeId)
  if (!map || !treeNode || treeNode.children.length === 0) return { elements: [...elements], select: nodeId }

  const descendants = new Set(branchIds(map, nodeId).filter((id) => id !== nodeId))
  const hide = (e: ExcalidrawElement) => {
    if (e.isDeleted) return false
    const meta = metaOf(e)
    const container = (e as Mutable).containerId
    return (
      descendants.has(e.id) ||
      (container != null && descendants.has(container)) ||
      isLinkOf(e, descendants) !== null ||
      (meta?.kind === 'badge' && descendants.has(meta.nodeId))
    )
  }
  const hidden = elements.filter(hide)
  const node = byId(elements, nodeId)!
  const meta = metaOf(node) as NodeMeta
  const collapsedMeta: NodeMeta = { ...meta, collapsed: true, hidden }
  const collapsedNode = update(node, { customData: { ...node.customData, rabisco: collapsedMeta } })
  const next = elements.map((e) => (e.id === nodeId ? collapsedNode : hide(e) ? update(e, { isDeleted: true }) : e))
  return { elements: relayout([...next, createBadge(collapsedNode, map.mapId, hiddenCount(collapsedMeta))], map.mapId), select: nodeId }
}

export function expand(elements: readonly ExcalidrawElement[], nodeId: string): CommandResult {
  const node = byId(elements, nodeId)
  const meta = node ? metaOf(node) : null
  if (!node || meta?.kind !== 'node' || !meta.collapsed) return { elements: [...elements], select: nodeId }

  const hidden = meta.hidden ?? []
  const rest: NodeMeta = { ...meta }
  delete rest.collapsed
  delete rest.hidden
  const expandedNode = update(node, { customData: { ...node.customData, rabisco: rest } })
  const badge = badgeOf(elements, nodeId)
  const restored = new Map(
    hidden.map((copy) => {
      // A restored element must outrank the deleted one still in the scene (or in the undo history).
      const existing = byId(elements, copy.id)
      const version = Math.max(existing?.version ?? 0, copy.version) + 1
      return [copy.id, update(copy, { isDeleted: false, version })]
    }),
  )
  const next: ExcalidrawElement[] = []
  for (const e of elements) {
    if (e.id === nodeId) {
      // Elements no longer in the scene (e.g. after reopening the file) go right before the node.
      for (const [id, element] of restored) if (!byId(elements, id)) next.push(element)
      next.push(expandedNode)
    } else if (restored.has(e.id)) next.push(restored.get(e.id)!)
    else if (badge && e.id === badge.id) next.push(update(e, { isDeleted: true }))
    else next.push(e)
  }
  return { elements: relayout(next, meta.mapId), select: nodeId }
}

export function toggleCollapse(elements: readonly ExcalidrawElement[], nodeId: string): CommandResult {
  const node = byId(elements, nodeId)
  const meta = node ? metaOf(node) : null
  if (meta?.kind === 'node' && meta.collapsed) return expand(elements, nodeId)
  return collapse(elements, nodeId)
}
