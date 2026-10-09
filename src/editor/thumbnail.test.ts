import 'vitest-canvas-mock'
import { exportToBlob } from '@excalidraw/excalidraw'
import { renderThumbnail, toDriveThumbnail } from './thumbnail'
import type { SceneData } from './scene'

vi.mock('@excalidraw/excalidraw', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@excalidraw/excalidraw')>()),
  exportToBlob: vi.fn(async () => new Blob([new Uint8Array([251, 255, 254, 0, 1])], { type: 'image/png' })),
}))

it('encodes PNG bytes as URL-safe base64 without padding', async () => {
  const thumbnail = await toDriveThumbnail(new Blob([new Uint8Array([251, 255, 254, 0, 1])], { type: 'image/png' }))
  expect(thumbnail).toEqual({ image: '-__-AAE', mimeType: 'image/png' })
  expect(thumbnail.image).not.toMatch(/[+/=]/)
})

it('has no thumbnail for an empty scene', async () => {
  const empty: SceneData = { elements: [], appState: {}, files: {} }
  await expect(renderThumbnail(empty)).resolves.toBeNull()
  expect(exportToBlob).not.toHaveBeenCalled()
})

it('renders at most 512px on the longest side', async () => {
  const scene = { elements: [{ id: 'a', isDeleted: false }], appState: {}, files: {} } as unknown as SceneData
  await expect(renderThumbnail(scene)).resolves.toEqual({ image: '-__-AAE', mimeType: 'image/png' })
  expect(exportToBlob).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'image/png', maxWidthOrHeight: 512 }))
})

it('ignores deleted elements when deciding if the scene is empty', async () => {
  vi.mocked(exportToBlob).mockClear()
  const scene = { elements: [{ id: 'a', isDeleted: true }], appState: {}, files: {} } as unknown as SceneData
  await expect(renderThumbnail(scene)).resolves.toBeNull()
  expect(exportToBlob).not.toHaveBeenCalled()
})
