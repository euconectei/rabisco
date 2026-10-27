// Plain-text outlines (markdown headings and lists) and their tree, with no editor dependency, so public
// pages can read them without loading Excalidraw.

export interface OutlineNode {
  text: string
  children: OutlineNode[]
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
const FENCE = /^ {0,3}(```|~~~)/

/**
 * Headings (#, ##…) nest by level; list items (-, *, +, 1.) by indentation (a tab counts as two
 * spaces), under the last heading. One top-level item is the root; several go under `fallbackRoot`.
 * Text with no heading and no list item is not an outline: null.
 *
 * `strict` (pasting): any other line, or a fenced code block, means "not an outline" (a pasted script
 * with # comments must stay text). Otherwise (importing a file) other lines, code included, become
 * topics under the current heading, so nothing in the file is lost.
 */
export function parseMarkdownOutline(text: string, fallbackRoot: string, { strict = false } = {}): OutlineNode | null {
  const top: OutlineNode = { text: fallbackRoot, children: [] }
  const stack: { kind: 'heading' | 'item'; level: number; node: OutlineNode }[] = [{ kind: 'heading', level: 0, node: top }]
  let headingLevel = 0
  let indents: number[] = []
  let found = false

  const add = (kind: 'heading' | 'item', level: number, itemText: string, structural = true) => {
    // A heading never nests inside a list item: unwind the items first, then headings of this level or deeper.
    if (kind === 'heading') while (stack.length > 1 && stack[stack.length - 1].kind === 'item') stack.pop()
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
    const node: OutlineNode = { text: itemText.trim(), children: [] }
    stack[stack.length - 1].node.children.push(node)
    stack.push({ kind, level, node })
    if (structural) found = true
  }

  let inFence = false
  for (const line of text.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      if (strict) return null
      inFence = !inFence
      continue
    }
    if (!line.trim()) continue
    if (inFence) {
      indents = []
      add('item', headingLevel + 1, line, false)
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      const indent = item[1].replace(/\t/g, '  ').length
      while (indents.length && indents[indents.length - 1] > indent) indents.pop()
      if (!indents.length || indents[indents.length - 1] < indent) indents.push(indent)
      add('item', headingLevel + indents.length, item[2])
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      headingLevel = heading[1].length
      indents = []
      add('heading', headingLevel, heading[2])
      continue
    }
    if (strict) return null
    indents = []
    add('item', headingLevel + 1, line, false)
  }
  if (!found) return null
  return top.children.length === 1 ? top.children[0] : top
}
