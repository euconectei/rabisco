import type { Language } from './languages'

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelativeTime(isoDate: string, lang: Language, now: number = Date.now()): string {
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const seconds = Math.round((Date.parse(isoDate) - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit)
  }
  return format.format(0, 'second')
}
