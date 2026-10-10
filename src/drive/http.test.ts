import { DriveError } from './errors'
import { createDriveFetch, RETRY_DELAYS_MS, type TokenSource } from './http'

const SECRET = 'ya29.secret-token'

function setup(responses: Array<Response | Error>, tokens?: Partial<TokenSource>) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift()
    if (!next) throw new Error('no more responses')
    if (next instanceof Error) throw next
    return next
  })
  vi.stubGlobal('fetch', fetchMock)
  const slept: number[] = []
  const source: TokenSource = {
    getToken: vi.fn(async () => SECRET),
    refreshToken: vi.fn(async () => 'fresh-token'),
    ...tokens,
  }
  const driveFetch = createDriveFetch(source, { sleep: async (ms) => void slept.push(ms) })
  return { driveFetch, fetchMock, slept, source }
}

const ok = () => new Response('{}', { status: 200 })
const status = (code: number) => new Response(null, { status: code })

afterEach(() => vi.unstubAllGlobals())

it('sends the bearer token and keeps other headers', async () => {
  const { driveFetch, fetchMock } = setup([ok()])
  await driveFetch('https://drive.test/x', { headers: { 'Content-Type': 'application/json' } })
  const headers = new Headers((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers)
  expect(headers.get('Authorization')).toBe(`Bearer ${SECRET}`)
  expect(headers.get('Content-Type')).toBe('application/json')
})

it('refreshes the token once on 401 and retries with the new one', async () => {
  const { driveFetch, fetchMock, source } = setup([status(401), ok()])
  const response = await driveFetch('https://drive.test/x')
  expect(response.status).toBe(200)
  expect(source.refreshToken).toHaveBeenCalledTimes(1)
  const headers = new Headers((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].headers)
  expect(headers.get('Authorization')).toBe('Bearer fresh-token')
})

it('gives up with an auth error after a second 401', async () => {
  const { driveFetch, source } = setup([status(401), status(401)])
  await expect(driveFetch('https://drive.test/x')).rejects.toMatchObject({ kind: 'auth' })
  expect(source.refreshToken).toHaveBeenCalledTimes(1)
})

it('propagates a failed refresh', async () => {
  const failure = new DriveError('auth', 'cannot renew')
  const { driveFetch } = setup([status(401)], { refreshToken: vi.fn(async () => Promise.reject(failure)) })
  await expect(driveFetch('https://drive.test/x')).rejects.toBe(failure)
})

it('retries server errors with growing delays', async () => {
  const { driveFetch, slept } = setup([status(503), status(503), ok()])
  expect((await driveFetch('https://drive.test/x')).status).toBe(200)
  expect(slept).toEqual([1000, 2000])
})

it('stops retrying rate limits after the last delay', async () => {
  const { driveFetch, slept, fetchMock } = setup(Array.from({ length: 7 }, () => status(429)))
  await expect(driveFetch('https://drive.test/x')).rejects.toMatchObject({ kind: 'rateLimit' })
  expect(slept).toEqual([...RETRY_DELAYS_MS])
  expect(fetchMock).toHaveBeenCalledTimes(7)
})

it('does not retry a 404', async () => {
  const { driveFetch, fetchMock } = setup([status(404)])
  await expect(driveFetch('https://drive.test/x')).rejects.toMatchObject({ kind: 'notFound' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('turns fetch failures into network errors without retrying', async () => {
  const { driveFetch, fetchMock } = setup([new TypeError('Failed to fetch')])
  await expect(driveFetch('https://drive.test/x')).rejects.toMatchObject({ kind: 'network' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('never leaks the token into error messages', async () => {
  const { driveFetch } = setup([status(404)])
  const error = await driveFetch('https://drive.test/x').catch((e: Error) => e)
  expect(String((error as Error).message)).not.toContain(SECRET)
  expect(JSON.stringify(error)).not.toContain(SECRET)
})
