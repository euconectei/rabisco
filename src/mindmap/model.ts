import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

// A mind map lives in plain Excalidraw elements: each node is a rectangle (with bound text) and each
// link an arrow. Rabisco's structure is kept in customData.rabisco so the file still opens as a
// normal drawing elsewhere (e.g. excalidraw.com).

export type Side = 'left' | 'right'

export interface NodeMeta {
  kind: 'node'
  mapId: string
  nodeId: string // === id of the rectangle
  parentId: string | null
  order: number
  side: Side | null // first-level nodes only; deeper levels inherit
  colorAuto: boolean
  /** Collapsed: the descendants' elements live (as copies) in `hidden` and are deleted from the scene. */
  collapsed?: boolean
  hidden?: ExcalidrawElement[]
}

export interface EdgeMeta {
  kind: 'edge'
  mapId: string
  childId: string
}

/** The small "+N" text next to a collapsed node. */
export interface BadgeMeta {
  kind: 'badge'
  mapId: string
  nodeId: string
}

export type RabiscoMeta = NodeMeta | EdgeMeta | BadgeMeta

export interface TreeNode {
  id: string
  parentId: string | null
  order: number
  side: Side | null
  children: TreeNode[]
  depth: number
}

export interface MindMap {
  mapId: string
  root: TreeNode
  byId: Map<string, TreeNode>
}

export function metaOf(element: ExcalidrawElement): RabiscoMeta | null {
  const meta = (element.customData as { rabisco?: unknown } | undefined)?.rabisco
  if (!meta || typeof meta !== 'object') return null
  const { kind, mapId } = meta as Record<string, unknown>
  if (typeof mapId !== 'string' || (kind !== 'node' && kind !== 'edge' && kind !== 'badge')) return null
  return meta as RabiscoMeta
}

/**
 * Reads every map in the scene. Invalid structures (missing parent, cycles, maps without exactly one
 * root, deleted elements) are dropped: those elements then behave like plain drawing elements.
 */
export function readMaps(elements: readonly ExcalidrawElement[]): Map<string, MindMap> {
  const nodesByMap = new Map<string, NodeMeta[]>()
  for (const element of elements) {
    if (element.isDeleted) continue
    const meta = metaOf(element)
    if (meta?.kind !== 'node' || meta.nodeId !== element.id) continue
    const list = nodesByMap.get(meta.mapId) ?? []
    list.push(meta)
    nodesByMap.set(meta.mapId, list)
  }

  const maps = new Map<string, MindMap>()
  for (const [mapId, metas] of nodesByMap) {
    const roots = metas.filter((meta) => meta.parentId === null)
    if (roots.length !== 1) continue
    const byId = new Map<string, TreeNode>()
    for (const meta of metas) {
      byId.set(meta.nodeId, { id: meta.nodeId, parentId: meta.parentId, order: meta.order, side: meta.side, children: [], depth: 0 })
    }
    for (const treeNode of byId.values()) {
      if (treeNode.parentId !== null) byId.get(treeNode.parentId)?.children.push(treeNode)
    }
    for (const treeNode of byId.values()) {
      treeNode.children.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    }

    // Walk from the root: nodes it never reaches (orphans, cycles) are left out of the map.
    const root = byId.get(roots[0].nodeId)!
    const reached = new Map<string, TreeNode>()
    const stack: TreeNode[] = [root]
    while (stack.length) {
      const current = stack.pop()!
      if (reached.has(current.id)) continue
      reached.set(current.id, current)
      for (const child of current.children) {
        child.depth = current.depth + 1
        stack.push(child)
      }
    }
    for (const treeNode of reached.values()) treeNode.children = treeNode.children.filter((child) => reached.has(child.id))
    maps.set(mapId, { mapId, root, byId: reached })
  }
  return maps
}

/** The side a node sits on: its first-level ancestor's side (right by default); null for the root. */
export function sideOf(map: MindMap, nodeId: string): Side | null {
  let current = map.byId.get(nodeId)
  while (current && current.depth > 1) current = map.byId.get(current.parentId!)
  return current && current.depth === 1 ? (current.side ?? 'right') : null
}

/** The node and all its descendants. */
export function branchIds(map: MindMap, nodeId: string): string[] {
  const start = map.byId.get(nodeId)
  if (!start) return []
  const ids: string[] = []
  const stack = [start]
  while (stack.length) {
    const current = stack.pop()!
    ids.push(current.id)
    stack.push(...current.children)
  }
  return ids
}

/** Nodes hidden under a collapsed node, at any depth (nested collapsed nodes count theirs too). */
export function hiddenCount(meta: NodeMeta): number {
  let count = 0
  for (const element of meta.hidden ?? []) {
    const inner = metaOf(element)
    if (inner?.kind === 'node' && inner.nodeId === element.id) count += 1 + hiddenCount(inner)
  }
  return count
}
