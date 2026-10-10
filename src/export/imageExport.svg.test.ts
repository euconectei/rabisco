import 'vitest-canvas-mock'
import { convertToExcalidrawElements, loadFromBlob } from '@excalidraw/excalidraw'
import { renderImage } from './imageExport'

// Real Excalidraw, no mocks: the SVG must carry the scene in a form Excalidraw reads back.
it('round-trips accented text and emoji through an SVG with editable data', async () => {
  const elements = convertToExcalidrawElements([{ type: 'text', x: 0, y: 0, text: 'Ação 😀' }])
  const { blob } = await renderImage(
    { elements, appState: {}, files: {} },
    {},
    { format: 'svg', scope: 'scene', background: true, darkMode: false, scale: 1, embedScene: true },
  )
  const restored = await loadFromBlob(blob, null, null)
  expect(restored.elements.map((element) => (element as { text?: string }).text)).toEqual(['Ação 😀'])
})
