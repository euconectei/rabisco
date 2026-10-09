import { readStoredLanguage, writeStoredLanguage } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('round-trips a valid language', () => {
  writeStoredLanguage('en')
  expect(readStoredLanguage()).toBe('en')
})

it('ignores invalid stored values', () => {
  for (const bad of ['fr', '', 'xx', '{"lang":"en"}']) {
    localStorage.setItem('rabisco.lang', bad)
    expect(readStoredLanguage()).toBeNull()
  }
})

it('survives storage that throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(readStoredLanguage()).toBeNull()
  expect(() => writeStoredLanguage('en')).not.toThrow()
})
