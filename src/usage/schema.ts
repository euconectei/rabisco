import { isLanguage, type Language } from '../i18n/languages'

export type UsageMode = 'local' | 'google'
export type UsageSource = 'blank' | 'import' | 'template'

/**
 * What the editor reports, and nothing more: no id of the person or the drawing, no content. Kept here
 * so the browser and the Pages Function agree on one closed shape.
 */
export type UsageEvent =
  | { type: 'drawing_created'; source: UsageSource; template: string | null; mode: UsageMode; lang: Language }
  | { type: 'drawing_returned'; template: string | null; mode: UsageMode; lang: Language }

export interface UsageDataPoint {
  indexes: [string]
  blobs: string[]
  doubles: [number]
}

const SOURCES: readonly string[] = ['blank', 'import', 'template']
const MODES: readonly string[] = ['local', 'google']
const FIELDS: Record<UsageEvent['type'], readonly string[]> = {
  drawing_created: ['type', 'source', 'template', 'mode', 'lang'],
  drawing_returned: ['type', 'template', 'mode', 'lang'],
}

function isUsageMode(value: unknown): value is UsageMode {
  return typeof value === 'string' && MODES.includes(value)
}

/** The event in a request body, or null for anything that is not exactly one of the known shapes. */
export function parseUsageEvent(body: unknown, knownTemplates: readonly string[]): UsageEvent | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  const type = record.type
  if (type !== 'drawing_created' && type !== 'drawing_returned') return null
  const keys = Object.keys(record)
  if (keys.length !== FIELDS[type].length || !keys.every((key) => FIELDS[type].includes(key))) return null
  const { template, mode, lang } = record
  if (template !== null && !(typeof template === 'string' && knownTemplates.includes(template))) return null
  if (!isUsageMode(mode) || !isLanguage(lang)) return null
  if (type === 'drawing_returned') return { type, template, mode, lang }
  const source = record.source
  if (typeof source !== 'string' || !SOURCES.includes(source)) return null
  if ((source === 'template') !== (template !== null)) return null
  return { type, source: source as UsageSource, template, mode, lang }
}

/** One Analytics Engine row: the event type as index, the fields as blobs (fixed order), a count of 1. */
export function toDataPoint(event: UsageEvent): UsageDataPoint {
  const source = event.type === 'drawing_created' ? event.source : ''
  return { indexes: [event.type], blobs: [event.type, source, event.template ?? '', event.mode, event.lang], doubles: [1] }
}
