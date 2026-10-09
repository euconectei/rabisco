import { hasUnseenWhatsNew, markWhatsNewSeen } from './seen'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('is unseen when nothing was stored', () => {
  expect(hasUnseenWhatsNew('2026-10-09')).toBe(true)
})

it('is seen after marking, and unseen again when a newer entry arrives', () => {
  markWhatsNewSeen('2026-10-09')
  expect(hasUnseenWhatsNew('2026-10-09')).toBe(false)
  expect(hasUnseenWhatsNew('2026-10-20')).toBe(true)
})

it('treats garbage stored values as unseen', () => {
  localStorage.setItem('rabisco.whatsNew.lastSeen', 'not-a-date')
  expect(hasUnseenWhatsNew('2026-10-09')).toBe(true)
})

it('never throws when storage is unavailable, and shows no dot', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  expect(hasUnseenWhatsNew('2026-10-09')).toBe(false)
  expect(() => markWhatsNewSeen('2026-10-09')).not.toThrow()
})

it('has nothing unseen when there are no entries', () => {
  expect(hasUnseenWhatsNew(undefined)).toBe(false)
})
