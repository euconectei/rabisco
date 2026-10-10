import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { findNodeOf } from './commands'
import { metaOf, readMaps, type NodeMeta } from './model'

export interface OutlineNode {
  text: string
  children: OutlineNode[]
}

type TextLike = ExcalidrawElement & { containerId?: string | null; text?: string; originalText?: string }

/** Live elements plus everything hidden inside collapsed nodes, at any depth. */
function withHidden(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = []
  const visit = (list: readonly ExcalidrawElement[]) => {
    for (const element of list) {
      if (element.isDeleted) continue
      out.push(element)
      const meta = metaOf(element)
      if (meta?.kind === 'node' && meta.hidden) visit(meta.hidden)
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

/** "- root\n  - child\n    - grandchild\n": two spaces per level, one line per node. */
export function outlineToMarkdown(root: OutlineNode): string {
  const lines: string[] = []
  const walk = (node: OutlineNode, depth: number) => {
    lines.push(`${'  '.repeat(depth)}- ${node.text.replace(/\s*\n\s*/g, ' ').trim()}`)
    for (const child of node.children) walk(child, depth + 1)
  }
  walk(root, 0)
  return `${lines.join('\n')}\n`
}

const LIST_ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(.*)$/
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t#]*$/

/**
 * Headings (#, ##…) nest by level; list items (-, *, +, 1.) by indentation (a tab counts as two
 * spaces), under the last heading. One top-level item is the root; several go under `fallbackRoot`.
 * Text with no heading and no list item is not an outline: null.
 */
export function parseMarkdownOutline(text: string, fallbackRoot: string): OutlineNode | null {
  const top: OutlineNode = { text: fallbackRoot, children: [] }
  const stack: { level: number; node: OutlineNode }[] = [{ level: 0, node: top }]
  let headingLevel = 0
  let indents: number[] = []
  let found = false

  const add = (level: number, itemText: string) => {
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
    const node: OutlineNode = { text: itemText.trim(), children: [] }
    stack[stack.length - 1].node.children.push(node)
    stack.push({ level, node })
    found = true
  }

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const item = LIST_ITEM.exec(line)
    if (item) {
      const indent = item[1].replace(/\t/g, '  ').length
      while (indents.length && indents[indents.length - 1] > indent) indents.pop()
      if (!indents.length || indents[indents.length - 1] < indent) indents.push(indent)
      add(headingLevel + indents.length, item[2])
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      headingLevel = heading[1].length
      indents = []
      add(headingLevel, heading[2])
    }
  }
  if (!found) return null
  return top.children.length === 1 ? top.children[0] : top
}

/** The map to export: the one of the selected node or, with no node selected, the drawing's only map. */
export function exportableMap(elements: readonly ExcalidrawElement[], selectedIds: readonly string[]): string | null {
  const selected = findNodeOf(elements, selectedIds)
  if (selected) return selected.mapId
  const maps = [...readMaps(elements).keys()]
  return maps.length === 1 ? maps[0] : null
}
