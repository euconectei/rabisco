import { MESSAGES } from '../i18n/messages'
import { whatsNewEntries } from './entries'

it('lists entries newest first, one entry per day', () => {
  const dates = whatsNewEntries.map((entry) => entry.date)
  expect(dates).toEqual([...dates].sort().reverse())
  expect(new Set(dates).size).toBe(dates.length)
})

it('uses valid yyyy-mm-dd dates', () => {
  for (const { date } of whatsNewEntries) {
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(`${date}T00:00:00`).getTime())).toBe(false)
  }
})

it('every section has a title and at least one item in every language', () => {
  for (const messages of Object.values(MESSAGES)) {
    for (const entry of whatsNewEntries) {
      for (const slug of entry.sections) {
        expect(messages.whatsNew.sections[slug].title).not.toBe('')
        expect(messages.whatsNew.sections[slug].items.length).toBeGreaterThan(0)
      }
    }
  }
})
