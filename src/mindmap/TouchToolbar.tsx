import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import { useEffect, useState } from 'react'
import { findNodeOf, mapOfNode } from './commands'
import { metaOf } from './model'

// On a tablet there is no Tab or Enter: a floating bar above the selected node runs the same
// commands. It shows only after a touch or pen tap (never for the mouse).

/** Bar width used to keep it on screen (four buttons of at least 44 px plus gaps). */
export const TOOLBAR_WIDTH = 260
const EDGE = 8
const ABOVE = 60

export interface TouchTarget {
  nodeId: string
  collapsed: boolean
  hasChildren: boolean
  /** Scene coordinates of the middle of the node's top edge. */
  x: number
  y: number
}

/** The single selected map node the bar acts on, or null (nothing, several things, or a text being edited). */
export function touchTarget(
  elements: readonly ExcalidrawElement[],
  appState: Pick<AppState, 'selectedElementIds' | 'editingTextElement'>,
): TouchTarget | null {
  if (appState.editingTextElement) return null
  const selected = Object.keys(appState.selectedElementIds).filter((id) => appState.selectedElementIds[id])
  const found = findNodeOf(elements, selected)
  const node = found ? elements.find((e) => e.id === found.nodeId) : undefined
  if (!found || !node) return null
  const meta = metaOf(node)
  const collapsed = meta?.kind === 'node' && !!meta.collapsed
  const hasChildren = collapsed || (mapOfNode(elements, found.nodeId)?.byId.get(found.nodeId)?.children.length ?? 0) > 0
  return { nodeId: found.nodeId, collapsed, hasChildren, x: node.x + node.width / 2, y: node.y }
}

/** Where the bar goes for a node anchored at viewport (x, y): centered above it. */
export function toolbarPosition(x: number, y: number) {
  return { left: x - TOOLBAR_WIDTH / 2, top: y - ABOVE }
}

/** True once `key` (e.g. scroll and zoom) has stopped changing for `ms`. */
export function useSettled(key: string, ms: number): boolean {
  const [settledKey, setSettledKey] = useState(key)
  useEffect(() => {
    const id = setTimeout(() => setSettledKey(key), ms)
    return () => clearTimeout(id)
  }, [key, ms])
  return settledKey === key
}

export interface TouchToolbarLabels {
  toolbar: string
  addChild: string
  addSibling: string
  collapse: string
  expand: string
  delete: string
}

export function TouchToolbar({
  theme = 'light',
  position,
  collapsed,
  canCollapse,
  labels,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onDelete,
}: {
  /** The editor's theme (Excalidraw's own, which can differ from the system's). */
  theme?: string
  position: { left: number; top: number }
  collapsed: boolean
  canCollapse: boolean
  labels: TouchToolbarLabels
  onAddChild: () => void
  onAddSibling: () => void
  onToggleCollapse: () => void
  onDelete: () => void
}) {
  const left = Math.max(EDGE, Math.min(position.left, window.innerWidth - TOOLBAR_WIDTH - EDGE))
  const top = Math.max(EDGE, position.top)
  return (
    <div className="touch-toolbar" data-theme={theme} role="toolbar" aria-label={labels.toolbar} style={{ left, top }}>
      <button type="button" onClick={onAddChild}>
        {labels.addChild}
      </button>
      <button type="button" onClick={onAddSibling}>
        {labels.addSibling}
      </button>
      <button type="button" onClick={onToggleCollapse} disabled={!canCollapse}>
        {collapsed ? labels.expand : labels.collapse}
      </button>
      <button type="button" onClick={onDelete}>
        {labels.delete}
      </button>
    </div>
  )
}
