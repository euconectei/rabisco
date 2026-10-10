import type { ExportOptions } from './imageExport'

const STORAGE_KEY = 'rabisco.exportOptions'

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  scope: 'scene',
  background: true,
  darkMode: false,
  scale: 2,
  embedScene: false,
}

const VALID: { [K in keyof ExportOptions]: readonly ExportOptions[K][] } = {
  format: ['png', 'svg'],
  scope: ['scene', 'selection'],
  background: [true, false],
  darkMode: [true, false],
  scale: [1, 2, 3],
  embedScene: [true, false],
}

function pick<K extends keyof ExportOptions>(saved: Record<string, unknown>, key: K): ExportOptions[K] {
  const value = saved[key] as ExportOptions[K]
  return VALID[key].includes(value) ? value : DEFAULT_EXPORT_OPTIONS[key]
}

/** The options used last time in this browser; anything missing or invalid falls back to the default. */
export function loadExportOptions(): ExportOptions {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>
  } catch {
    // Unreadable or unavailable storage: start from the defaults.
  }
  return {
    format: pick(saved, 'format'),
    scope: pick(saved, 'scope'),
    background: pick(saved, 'background'),
    darkMode: pick(saved, 'darkMode'),
    scale: pick(saved, 'scale'),
    embedScene: pick(saved, 'embedScene'),
  }
}

export function saveExportOptions(options: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    // Storage unavailable: the options are simply not remembered.
  }
}
