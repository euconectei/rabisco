import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { findNodeOf } from './commands'
import { metaOf, readMaps, type NodeMeta } from './model'

export { outlineToMarkdown, parseMarkdownOutline, type OutlineNode } from './outline'
import type { OutlineNode } from './outline'

type TextLike = ExcalidrawElement & { containerId?: string | null; text?: string; originalText?: string }

/** Live elements plus everything hidden inside collapsed nodes, at any depth. */
function withHidden(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = []
  const seen = new Set<string>()
  const visit = (list: readonly ExcalidrawElement[]) => {
    for (const element of list) {
      if (element.isDeleted || seen.has(element.id)) continue
      seen.add(element.id)
      out.push(element)
      const meta = metaOf(element)
      // Copies of a collapsed node (Ctrl+D, paste) carry the same hidden branch: only the node itself counts.
      if (meta?.kind === 'node' && meta.nodeId === element.id && meta.hidden) visit(meta.hidden)
    }
  }
  visit(elements)
  return out
}

/** The map as an outline, collapsed branches included. */
export function mapToOutline(elements: readonly ExcalidrawElement[], mapId: string): OutlineNode {
  const all = withHidden(elements)
  const metas = all
    .map((e) => ({ e, meta: metaOf(e) }))
    .filter((x): x is { e: ExcalidrawElement; meta: NodeMeta } => x.meta?.kind === 'node' && x.meta.mapId === mapId && x.meta.nodeId === x.e.id)
    .map((x) => x.meta)
  const textOf = (id: string) => {
    const text = all.find((e) => (e as TextLike).containerId === id) as TextLike | undefined
    return text?.originalText ?? text?.text ?? ''
  }
  const build = (meta: NodeMeta): OutlineNode => ({
    text: textOf(meta.nodeId),
    children: metas
      .filter((child) => child.parentId === meta.nodeId)
      .sort((a, b) => a.order - b.order || a.nodeId.localeCompare(b.nodeId))
      .map(build),
  })
  const root = metas.find((meta) => meta.parentId === null)
  return root ? build(root) : { text: '', children: [] }
}

/** The map to export: the one of the selected node or, with no node selected, the drawing's only map. */
export function exportableMap(elements: readonly ExcalidrawElement[], selectedIds: readonly string[]): string | null {
  const selected = findNodeOf(elements, selectedIds)
  if (selected) return selected.mapId
  const maps = [...readMaps(elements).keys()]
  return maps.length === 1 ? maps[0] : null
}
