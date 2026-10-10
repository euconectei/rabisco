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

/** A link carrying Rabisco metadata. No endBinding by default (lines style); add one via `extra`. */
export function edge(id: string, childId: string, extra: Record<string, unknown> = {}, mapId = 'm1'): ExcalidrawElement {
  return {
    id,
    type: 'arrow',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isDeleted: false,
    ...extra,
    customData: { rabisco: { kind: 'edge', mapId, childId } },
  } as unknown as ExcalidrawElement
}

/** A lines-style underline decoration for a node. */
export function underline(id: string, nodeId: string, mapId = 'm1'): ExcalidrawElement {
  return {
    id,
    type: 'line',
    x: 0,
    y: 0,
    width: 10,
    height: 0,
    isDeleted: false,
    customData: { rabisco: { kind: 'underline', mapId, nodeId } },
  } as unknown as ExcalidrawElement
}

/** A lines-style knob decoration for a node. */
export function knob(id: string, nodeId: string, mapId = 'm1'): ExcalidrawElement {
  return {
    id,
    type: 'ellipse',
    x: 0,
    y: 0,
    width: 8,
    height: 8,
    isDeleted: false,
    customData: { rabisco: { kind: 'knob', mapId, nodeId } },
  } as unknown as ExcalidrawElement
}
