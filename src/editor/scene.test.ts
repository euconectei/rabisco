import 'vitest-canvas-mock'
import fixture from './fixtures/excalidraw-com.excalidraw?raw'
import { emptySceneJson, parseScene, serializeScene } from './scene'

it('opens a file exported by excalidraw.com', () => {
  const scene = parseScene(fixture)
  expect(scene.elements.map((element) => element.id)).toEqual(['rect-1', 'text-1'])
  const text = scene.elements.find((element) => element.type === 'text') as { text: string }
  expect(text.text).toBe('Ideia principal')
  expect(scene.appState.viewBackgroundColor).toBe('#ffffff')
})

it('round-trips ids and texts through serialize and parse', () => {
  const again = parseScene(serializeScene(parseScene(fixture)))
  expect(again.elements.map((element) => element.id)).toEqual(['rect-1', 'text-1'])
  expect((again.elements[1] as { text: string }).text).toBe('Ideia principal')
})

it('produces an empty Excalidraw scene for new files', () => {
  const json = emptySceneJson()
  expect(JSON.parse(json)).toMatchObject({ type: 'excalidraw', elements: [] })
  expect(parseScene(json).elements).toEqual([])
})

it.each([
  ['empty text', ''],
  ['whitespace', '   '],
  ['broken JSON', '{"type":"excalidraw",'],
  ['JSON from another app', '{"type":"tldraw","elements":[]}'],
  ['elements that are not a list', '{"type":"excalidraw","elements":{}}'],
  ['a JSON array', '[]'],
  ['null', 'null'],
])('rejects %s as an invalid file', (_label, text) => {
  expect(() => parseScene(text)).toThrow(expect.objectContaining({ kind: 'invalidFile' }))
})
