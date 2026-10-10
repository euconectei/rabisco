import { exportToBlob } from '@excalidraw/excalidraw'
import type { DriveThumbnail } from '../drive/client'
import type { SceneData } from './scene'

const MAX_SIDE_PX = 512

export async function toDriveThumbnail(png: Blob): Promise<DriveThumbnail> {
  const bytes = new Uint8Array(await png.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const image = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return { image, mimeType: 'image/png' }
}

export async function renderThumbnail(scene: SceneData): Promise<DriveThumbnail | null> {
  const elements = scene.elements.filter((element) => !element.isDeleted)
  if (elements.length === 0) return null
  const png = await exportToBlob({
    elements,
    appState: { ...scene.appState, exportBackground: true },
    files: scene.files,
    mimeType: 'image/png',
    maxWidthOrHeight: MAX_SIDE_PX,
  })
  return toDriveThumbnail(png)
}
