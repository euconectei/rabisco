import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { addChild, createMap, type CommandResult } from './commands'
import type { Point } from './layout'
import type { OutlineNode } from './markdown'

/** Creates a mind map from an outline, its root centered on `at`; selects the root. */
export function importOutline(elements: readonly ExcalidrawElement[], outline: OutlineNode, at: Point): CommandResult {
  const created = createMap(elements, at, outline.text)
  const rootId = created.select!
  let current = created.elements
  const grow = (parentId: string, children: OutlineNode[]) => {
    for (const child of children) {
      const result = addChild(current, parentId, child.text)
      current = result.elements
      grow(result.select!, child.children)
    }
  }
  grow(rootId, outline.children)
  return { elements: current, select: rootId }
}
