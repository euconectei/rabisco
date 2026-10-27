import type { Language } from '../i18n/languages'
import { isLocalId } from '../local/ids'
import type { UsageEvent, UsageMode, UsageSource } from './schema'

const ENDPOINT = '/api/event'
const ORIGINS_KEY = 'rabisco.origins'
const MAX_ORIGINS = 200

/** Fire and forget: counting must never slow down or break the editor. */
export function sendUsageEvent(event: UsageEvent): void {
  try {
    const body = JSON.stringify(event)
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return
    void fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch {
    // Nothing to do: an event that cannot be sent is not counted.
  }
}

export function usageModeOf(fileId: string): UsageMode {
  return isLocalId(fileId) ? 'local' : 'google'
}

function readOrigins(): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ORIGINS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((entry): entry is [string, string] => Array.isArray(entry) && entry.length === 2) : []
  } catch {
    return []
  }
}

/** Which template a drawing came from, kept in this browser only (oldest entries dropped past 200). */
export function rememberOrigin(fileId: string, templateId: string): void {
  try {
    const origins = readOrigins().filter(([id]) => id !== fileId)
    origins.push([fileId, templateId])
    localStorage.setItem(ORIGINS_KEY, JSON.stringify(origins.slice(-MAX_ORIGINS)))
  } catch {
    // Without storage, returns are counted without their template.
  }
}

export function originOf(fileId: string): string | null {
  return readOrigins().find(([id]) => id === fileId)?.[1] ?? null
}

export function trackCreated(source: UsageSource, template: string | null, fileId: string, lang: Language): void {
  const mode = usageModeOf(fileId)
  if (source === 'template' && template) {
    rememberOrigin(fileId, template)
    sendUsageEvent({ type: 'drawing_created', source, template, mode, lang })
  } else {
    sendUsageEvent({ type: 'drawing_created', source: source === 'template' ? 'blank' : source, template: null, mode, lang })
  }
}

const returnedThisSession = new Set<string>()

/**
 * Counts "came back to edit": the first save of this session for a drawing last changed before today.
 * Once per drawing per session (page load).
 */
export function trackReturnedOnce(fileId: string, previousModifiedTime: string | undefined, lang: Language, now: Date = new Date()): void {
  if (!previousModifiedTime || returnedThisSession.has(fileId)) return
  const previous = Date.parse(previousModifiedTime)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (Number.isNaN(previous) || previous >= startOfToday) return
  returnedThisSession.add(fileId)
  sendUsageEvent({ type: 'drawing_returned', template: originOf(fileId), mode: usageModeOf(fileId), lang })
}

/** Tests only: forget which drawings were already counted. */
export function resetReturnedForTests(): void {
  returnedThisSession.clear()
}
