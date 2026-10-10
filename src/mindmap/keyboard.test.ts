import { actionForKey } from './keyboard'

const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
  key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods,
})

it.each([
  ['Tab', { type: 'addChild' }],
  ['Enter', { type: 'addSibling' }],
  ['Delete', { type: 'delete' }],
  ['Backspace', { type: 'delete' }],
  ['F2', { type: 'editText' }],
  ['ArrowLeft', { type: 'navigate', key: 'ArrowLeft' }],
  ['ArrowDown', { type: 'navigate', key: 'ArrowDown' }],
])('%s maps to an action', (k, action) => {
  expect(actionForKey(key(k))).toEqual(action)
})

it('leaves combinations and other keys to Excalidraw and the browser', () => {
  expect(actionForKey(key('Tab', { ctrlKey: true }))).toBeNull()
  expect(actionForKey(key('Enter', { metaKey: true }))).toBeNull()
  expect(actionForKey(key('ArrowLeft', { altKey: true }))).toBeNull()
  expect(actionForKey(key('Tab', { shiftKey: true }))).toBeNull()
  expect(actionForKey(key('a'))).toBeNull()
  expect(actionForKey(key('Escape'))).toBeNull()
})

it.each([[{ ctrlKey: true }], [{ metaKey: true }]])('Ctrl/Cmd + . toggles collapse (%o)', (mods) => {
  expect(actionForKey(key('.', mods))).toEqual({ type: 'toggleCollapse' })
})

it('a plain "." or Ctrl+Shift+. is not the collapse shortcut', () => {
  expect(actionForKey(key('.'))).toBeNull()
  expect(actionForKey(key('.', { ctrlKey: true, shiftKey: true }))).toBeNull()
})
