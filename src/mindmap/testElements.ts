// Test helper: minimal element objects carrying Rabisco metadata (not real Excalidraw elements).
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export function node(id: string, parentId: string | null, order = 0, extra: Record<string, unknown> = {}, mapId = 'm1'): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    isDeleted: false,
    customData: { rabisco: { kind: 'node', mapId, nodeId: id, parentId, order, side: null, colorAuto: true, ...extra } },
  } as unknown as ExcalidrawElement
}

export function plain(id: string): ExcalidrawElement {
  return { id, type: 'rectangle', x: 0, y: 0, width: 10, height: 10, isDeleted: false } as unknown as ExcalidrawElement
}
