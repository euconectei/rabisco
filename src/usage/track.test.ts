import { originOf, rememberOrigin, resetReturnedForTests, sendUsageEvent, trackCreated, trackReturnedOnce } from './track'

const post = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }))

beforeEach(() => {
  localStorage.clear()
  resetReturnedForTests()
  post.mockClear()
  vi.stubGlobal('fetch', post)
})

afterEach(() => vi.unstubAllGlobals())

function sent(): unknown[] {
  return post.mock.calls.map(([, init]) => JSON.parse(init.body as string))
}

const now = new Date(2026, 9, 26, 15, 0)

it('counts a return the first time a drawing changed before today is saved', async () => {
  rememberOrigin('local-1', 'revolucao-francesa')
  trackReturnedOnce('local-1', new Date(2026, 9, 25, 23, 0).toISOString(), 'pt-BR', now)
  trackReturnedOnce('local-1', new Date(2026, 9, 25, 23, 0).toISOString(), 'pt-BR', now)
  expect(sent()).toEqual([{ type: 'drawing_returned', template: 'revolucao-francesa', mode: 'local', lang: 'pt-BR' }])
})

it('does not count a drawing already changed today, or with no date', () => {
  trackReturnedOnce('abc', new Date(2026, 9, 26, 0, 5).toISOString(), 'en', now)
  trackReturnedOnce('def', undefined, 'en', now)
  trackReturnedOnce('ghi', 'not a date', 'en', now)
  expect(post).not.toHaveBeenCalled()
})

it('counts a creation with its source and remembers the template', async () => {
  trackCreated('template', 'resumo', 'local-9', 'en')
  trackCreated('import', null, 'drive-id', 'pt-BR')
  expect(sent()).toEqual([
    { type: 'drawing_created', source: 'template', template: 'resumo', mode: 'local', lang: 'en' },
    { type: 'drawing_created', source: 'import', template: null, mode: 'google', lang: 'pt-BR' },
  ])
  expect(originOf('local-9')).toBe('resumo')
})

it('sends without cookies, to this site only', () => {
  sendUsageEvent({ type: 'drawing_returned', template: null, mode: 'local', lang: 'en' })
  expect(post).toHaveBeenCalledWith('/api/event', expect.objectContaining({ method: 'POST', credentials: 'omit', keepalive: true }))
})

it('never throws when sending fails', () => {
  post.mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => sendUsageEvent({ type: 'drawing_returned', template: null, mode: 'local', lang: 'en' })).not.toThrow()
  post.mockRejectedValue(new Error('offline'))
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
