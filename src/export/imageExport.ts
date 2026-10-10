import { exportToBlob, exportToSvg, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawElement, ExcalidrawFrameLikeElement, NonDeleted } from '@excalidraw/excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import type { SceneData } from '../editor/scene'
import { encodePngMetadata } from './png'

export type ExportFormat = 'png' | 'svg'
export type ExportScope = 'scene' | 'selection'
export type ExportScale = 1 | 2 | 3

export interface ExportOptions {
  format: ExportFormat
  scope: ExportScope
  background: boolean
  darkMode: boolean
  scale: ExportScale
  /** "Include editable data": the scene travels inside the image, so it can be reopened. */
  embedScene: boolean
}

export interface ExportResult {
  blob: Blob
  mimeType: string
}

type Selection = AppState['selectedElementIds']

const isFrame = (element: ExcalidrawElement) => element.type === 'frame' || element.type === 'magicframe'

/**
 * What an export draws. A selection brings along the text bound to its containers and the members
 * of its frames; a lone selected frame is exported as a frame (clipped to it), like Excalidraw does.
 */
export function exportableElements(
  elements: readonly ExcalidrawElement[],
  selected: Selection,
  scope: ExportScope,
): { exported: NonDeleted<ExcalidrawElement>[]; exportingFrame: ExcalidrawFrameLikeElement | null } {
  const alive = elements.filter((element): element is NonDeleted<ExcalidrawElement> => !element.isDeleted)
  if (scope === 'scene') return { exported: alive, exportingFrame: null }
  const ids = new Set(Object.entries(selected).filter(([, on]) => on).map(([id]) => id))
  const exported = alive.filter(
    (element) =>
      ids.has(element.id) ||
      ('containerId' in element && !!element.containerId && ids.has(element.containerId)) ||
      (!!element.frameId && ids.has(element.frameId)),
  )
  const frames = exported.filter((element) => ids.has(element.id) && isFrame(element))
  const exportingFrame = frames.length === 1 && ids.size === 1 ? (frames[0] as ExcalidrawFrameLikeElement) : null
  return { exported, exportingFrame }
}

export async function renderImage(scene: SceneData, selected: Selection, options: ExportOptions): Promise<ExportResult> {
  const { exported, exportingFrame } = exportableElements(scene.elements, selected, options.scope)
  const appState = { ...scene.appState, exportBackground: options.background, exportWithDarkMode: options.darkMode }
  if (options.format === 'svg') {
    const svg = await exportToSvg({
      elements: exported,
      appState: { ...appState, exportScale: options.scale, exportEmbedScene: options.embedScene },
      files: scene.files,
      exportingFrame,
    })
    return { blob: new Blob([svg.outerHTML], { type: 'image/svg+xml' }), mimeType: 'image/svg+xml' }
  }
  const scale = options.scale
  let blob = await exportToBlob({
    elements: exported,
    appState,
    files: scene.files,
    mimeType: 'image/png',
    exportingFrame,
    getDimensions: (width: number, height: number) => ({ width: width * scale, height: height * scale, scale }),
  })
  // Excalidraw's public exportToBlob never embeds the scene, so we add it ourselves.
  if (options.embedScene) blob = await encodePngMetadata(blob, serializeAsJSON(exported, scene.appState, scene.files, 'local'))
  return { blob, mimeType: 'image/png' }
}

export function exportFileName(baseName: string, format: ExportFormat, fallback: string): string {
  return `${baseName || fallback}.${format}`
}
