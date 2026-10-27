import { originOf, rememberOrigin, resetReturnedForTests, sendUsageEvent, trackCreated, trackReturnedOnce } from './track'

const beacon = vi.fn<(url: string, data: Blob) => boolean>(() => true)

beforeEach(() => {
  localStorage.clear()
  resetReturnedForTests()
  beacon.mockClear()
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
})

async function sent(): Promise<unknown[]> {
  return Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await blob.text())))
}

const now = new Date(2026, 9, 26, 15, 0)

it('counts a return the first time a drawing changed before today is saved', async () => {
  rememberOrigin('local-1', 'revolucao-francesa')
  trackReturnedOnce('local-1', new Date(2026, 9, 25, 23, 0).toISOString(), 'pt-BR', now)
  trackReturnedOnce('local-1', new Date(2026, 9, 25, 23, 0).toISOString(), 'pt-BR', now)
  expect(await sent()).toEqual([{ type: 'drawing_returned', template: 'revolucao-francesa', mode: 'local', lang: 'pt-BR' }])
})

it('does not count a drawing already changed today, or with no date', () => {
  trackReturnedOnce('abc', new Date(2026, 9, 26, 0, 5).toISOString(), 'en', now)
  trackReturnedOnce('def', undefined, 'en', now)
  trackReturnedOnce('ghi', 'not a date', 'en', now)
  expect(beacon).not.toHaveBeenCalled()
})

it('counts a creation with its source and remembers the template', async () => {
  trackCreated('template', 'resumo', 'local-9', 'en')
  trackCreated('import', null, 'drive-id', 'pt-BR')
  expect(await sent()).toEqual([
    { type: 'drawing_created', source: 'template', template: 'resumo', mode: 'local', lang: 'en' },
    { type: 'drawing_created', source: 'import', template: null, mode: 'google', lang: 'pt-BR' },
  ])
  expect(originOf('local-9')).toBe('resumo')
})

it('never throws when sending fails', () => {
  beacon.mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => sendUsageEvent({ type: 'drawing_returned', template: null, mode: 'local', lang: 'en' })).not.toThrow()
})

it('keeps the 200 most recent origins and survives a storage that throws', () => {
  for (let i = 0; i < 205; i++) rememberOrigin(`local-${i}`, 'resumo')
  expect(originOf('local-0')).toBeNull()
  expect(originOf('local-204')).toBe('resumo')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  expect(() => rememberOrigin('local-x', 'resumo')).not.toThrow()
  vi.restoreAllMocks()
})
