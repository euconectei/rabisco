import { restore, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import { DriveError } from '../drive/errors'

export interface SceneData {
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

const notExcalidraw = () => new DriveError('invalidFile', 'Not an Excalidraw drawing')

export function serializeScene(scene: SceneData): string {
  return serializeAsJSON(scene.elements, scene.appState, scene.files, 'local')
}

export function emptySceneJson(): string {
  return serializeScene({ elements: [], appState: {}, files: {} })
}

export function parseScene(text: string): SceneData {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw notExcalidraw()
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw notExcalidraw()
  const { type, elements, appState, files } = data as Record<string, unknown>
  if (type !== 'excalidraw' || !Array.isArray(elements)) throw notExcalidraw()
  const restored = restore(
    { elements, appState: (appState ?? {}) as Partial<AppState>, files: (files ?? {}) as BinaryFiles },
    null,
    null,
  )
  return { elements: restored.elements, appState: restored.appState, files: restored.files }
}
