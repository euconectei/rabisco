import type { NavigationKey } from './commands'

export type MindmapAction =
  | { type: 'addChild' }
  | { type: 'addSibling' }
  | { type: 'delete' }
  | { type: 'navigate'; key: NavigationKey }
  | { type: 'editText' }
  | { type: 'toggleCollapse' }

interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const NAVIGATION = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

/** Mind map shortcuts. Any modifier means "not ours": Excalidraw and the browser keep their shortcuts. */
export function actionForKey(event: KeyLike): MindmapAction | null {
  const ctrlOrCmd = event.ctrlKey || event.metaKey
  if (ctrlOrCmd && !event.altKey && !event.shiftKey && event.key === '.') return { type: 'toggleCollapse' }
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null
  if (event.key === 'Tab') return { type: 'addChild' }
  if (event.key === 'Enter') return { type: 'addSibling' }
  if (event.key === 'Delete' || event.key === 'Backspace') return { type: 'delete' }
  if (event.key === 'F2') return { type: 'editText' }
  if (NAVIGATION.has(event.key)) return { type: 'navigate', key: event.key as NavigationKey }
  return null
}
