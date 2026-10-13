import { readConsent, writeConsent } from './consent'

beforeEach(() => localStorage.clear())

it('round-trips the choice', () => {
  expect(readConsent()).toBeNull()
  writeConsent('accepted')
  expect(localStorage.getItem('rabisco.adConsent')).toBe('accepted')
  expect(readConsent()).toBe('accepted')
  writeConsent('declined')
  expect(readConsent()).toBe('declined')
})

it('ignores anything else stored under the key', () => {
  localStorage.setItem('rabisco.adConsent', 'yes')
  expect(readConsent()).toBeNull()
})

it('survives unavailable storage', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  expect(readConsent()).toBeNull()
  expect(() => writeConsent('accepted')).not.toThrow()
  get.mockRestore()
  set.mockRestore()
})
