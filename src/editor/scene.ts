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

// Fields that change without the drawing changing: restore() re-rolls versionNonce, and version /
// updated move with every internal touch. Comparing scenes must ignore them.
const VOLATILE_ELEMENT_FIELDS = new Set(['version', 'versionNonce', 'updated'])

/** A content fingerprint for comparing two scenes (e.g. a local draft against the Drive file). */
export function sceneSignature(scene: SceneData): string {
  const parsed = JSON.parse(serializeScene(scene)) as { elements: Array<Record<string, unknown>>; appState: unknown; files: unknown }
  const elements = parsed.elements.map((element) =>
    Object.fromEntries(Object.entries(element).filter(([key]) => !VOLATILE_ELEMENT_FIELDS.has(key))),
  )
  return JSON.stringify({ elements, appState: parsed.appState, files: parsed.files })
}
