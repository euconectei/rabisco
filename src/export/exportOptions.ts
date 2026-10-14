import type { ExportOptions } from './imageExport'

const STORAGE_KEY = 'rabisco.exportOptions'
// Bump when a saved field's meaning changes. Objects without this marker were written by an
// older version, which stored every field (including embedScene: false) without a real choice.
const STORAGE_VERSION = 2

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  scope: 'scene',
  background: true,
  darkMode: false,
  scale: 2,
  // On for anyone who never chose: an image that carries its drawing can be reopened and edited,
  // which people rarely discover on their own. A saved choice (either way) still wins.
  embedScene: true,
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
  // A save from before the version marker has no real embed choice, so the new default applies.
  const savedEmbed = saved.v === STORAGE_VERSION ? saved.embedScene : undefined
  return {
    format: oneOf(saved.format, ['png', 'svg'] as const, d.format),
    scope: oneOf(saved.scope, ['scene', 'selection'] as const, d.scope),
    background: oneOf(saved.background, BOOLEANS, d.background),
    darkMode: oneOf(saved.darkMode, BOOLEANS, d.darkMode),
    scale: oneOf(saved.scale, [1, 2, 3] as const, d.scale),
    embedScene: oneOf(savedEmbed, BOOLEANS, d.embedScene),
  }
}

export function saveExportOptions(options: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...options, v: STORAGE_VERSION }))
  } catch {
    // Storage unavailable: the options are simply not remembered.
  }
}
