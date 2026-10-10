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

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

const BOOLEANS = [true, false] as const

/** The options used last time in this browser; anything missing or invalid falls back to the default. */
export function loadExportOptions(): ExportOptions {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>
  } catch {
    // Unreadable or unavailable storage: start from the defaults.
  }
  const d = DEFAULT_EXPORT_OPTIONS
  return {
    format: oneOf(saved.format, ['png', 'svg'] as const, d.format),
    scope: oneOf(saved.scope, ['scene', 'selection'] as const, d.scope),
    background: oneOf(saved.background, BOOLEANS, d.background),
    darkMode: oneOf(saved.darkMode, BOOLEANS, d.darkMode),
    scale: oneOf(saved.scale, [1, 2, 3] as const, d.scale),
    embedScene: oneOf(saved.embedScene, BOOLEANS, d.embedScene),
  }
}

export function saveExportOptions(options: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    // Storage unavailable: the options are simply not remembered.
  }
}
