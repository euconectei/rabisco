import { formatRelativeTime } from './relativeTime'

const now = Date.parse('2026-10-09T15:00:00Z')
const ago = (ms: number) => new Date(now - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

it.each([
  [10_000, 'pt-BR', 'agora'],
  [5 * MIN, 'pt-BR', 'há 5 minutos'],
  [2 * HOUR, 'pt-BR', 'há 2 horas'],
  [DAY, 'pt-BR', 'ontem'],
  [3 * DAY, 'pt-BR', 'há 3 dias'],
  [2 * HOUR, 'en', '2 hours ago'],
  [DAY, 'en', 'yesterday'],
  [45 * DAY, 'en', 'last month'],
  [400 * DAY, 'en', 'last year'],
] as const)('%i ms ago in %s reads "%s"', (ms, lang, expected) => {
  expect(formatRelativeTime(ago(ms), lang, now)).toBe(expected)
})
