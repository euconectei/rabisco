import 'vitest-canvas-mock'
import { exportToBlob, exportToSvg } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { SceneData } from '../editor/scene'
import { exportableElements, exportFileName, renderImage, type ExportOptions } from './imageExport'
import { encodePngMetadata } from './png'

vi.mock('@excalidraw/excalidraw', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@excalidraw/excalidraw')>()),
  exportToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  exportToSvg: vi.fn(async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('id', 'exported')
    return svg
  }),
}))

vi.mock('./png', () => ({
  encodePngMetadata: vi.fn(async () => new Blob(['png+scene'], { type: 'image/png' })),
}))

const el = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: 'rectangle', isDeleted: false, ...extra }) as unknown as ExcalidrawElement

const OPTIONS: ExportOptions = { format: 'png', scope: 'scene', background: true, darkMode: false, scale: 2, embedScene: false }

const scene = (elements: ExcalidrawElement[]): SceneData => ({ elements, appState: { viewBackgroundColor: '#fff' }, files: {} })

beforeEach(() => vi.clearAllMocks())

describe('exportableElements', () => {
  const elements = [
    el('box'),
    el('label', { type: 'text', containerId: 'box' }),
    el('other'),
    el('frame', { type: 'frame' }),
    el('inside', { frameId: 'frame' }),
    el('gone', { isDeleted: true }),
  ]

  it('exports every element that is not deleted for the whole scene, whatever is selected', () => {
    const { exported, exportingFrame } = exportableElements(elements, { other: true }, 'scene')
    expect(exported.map((e) => e.id)).toEqual(['box', 'label', 'other', 'frame', 'inside'])
    expect(exportingFrame).toBeNull()
  })

  it('takes the text bound to a selected container along with it', () => {
    expect(exportableElements(elements, { box: true }, 'selection').exported.map((e) => e.id)).toEqual(['box', 'label'])
  })

  it('exports a selected frame with its members, framed', () => {
    const { exported, exportingFrame } = exportableElements(elements, { frame: true }, 'selection')
    expect(exported.map((e) => e.id)).toEqual(['frame', 'inside'])
    expect(exportingFrame?.id).toBe('frame')
  })

  it('has nothing to export for a selection that is empty', () => {
    expect(exportableElements(elements, {}, 'selection').exported).toEqual([])
  })
})

describe('renderImage', () => {
  it('renders a PNG at the chosen scale, background and theme', async () => {
    const result = await renderImage(scene([el('a')]), {}, { ...OPTIONS, background: false, darkMode: true })
    expect(result.mimeType).toBe('image/png')
    const call = vi.mocked(exportToBlob).mock.calls[0][0]
    expect(call.mimeType).toBe('image/png')
    expect(call.appState).toMatchObject({ exportBackground: false, exportWithDarkMode: true })
    expect(call.getDimensions?.(100, 50)).toEqual({ width: 200, height: 100, scale: 2 })
    expect(encodePngMetadata).not.toHaveBeenCalled()
  })

  it('embeds the exported elements in the PNG when editable data is included', async () => {
    const result = await renderImage(scene([el('a'), el('b')]), { a: true }, { ...OPTIONS, scope: 'selection', embedScene: true })
    expect(await result.blob.text()).toBe('png+scene')
    const json = JSON.parse(vi.mocked(encodePngMetadata).mock.calls[0][1]) as { type: string; elements: Array<{ id: string }> }
    expect(json.type).toBe('excalidraw')
    expect(json.elements.map((e) => e.id)).toEqual(['a'])
  })

  it('renders an SVG with the scale and the embed option', async () => {
    const result = await renderImage(scene([el('a')]), {}, { ...OPTIONS, format: 'svg', scale: 3, embedScene: true })
    expect(result.mimeType).toBe('image/svg+xml')
    expect(await result.blob.text()).toContain('id="exported"')
    expect(vi.mocked(exportToSvg).mock.calls[0][0].appState).toMatchObject({ exportScale: 3, exportEmbedScene: true, exportBackground: true })
  })
})

describe('exportFileName', () => {
  it('names the image after the drawing', () => {
    expect(exportFileName('Plano', 'png', 'Sem título')).toBe('Plano.png')
  })

  it('falls back to the given name for an unnamed drawing', () => {
    expect(exportFileName('', 'svg', 'Untitled')).toBe('Untitled.svg')
  })
})
