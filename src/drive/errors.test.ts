import { classifyResponse, DriveError, isRetryable } from './errors'

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

it.each([
  [401, 'auth'],
  [404, 'notFound'],
  [429, 'rateLimit'],
  [500, 'server'],
  [503, 'server'],
  [400, 'unknown'],
])('classifies %i as %s', async (status, kind) => {
  const error = await classifyResponse(jsonResponse(status))
  expect(error).toBeInstanceOf(DriveError)
  expect(error.kind).toBe(kind)
  expect(error.status).toBe(status)
})

it('classifies 403 rate limits by reason', async () => {
  const body = { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }
  expect((await classifyResponse(jsonResponse(403, body))).kind).toBe('rateLimit')
  const other = { error: { errors: [{ reason: 'rateLimitExceeded' }] } }
  expect((await classifyResponse(jsonResponse(403, other))).kind).toBe('rateLimit')
})

it('classifies other 403s as forbidden, even with a non-JSON body', async () => {
  const body = { error: { errors: [{ reason: 'insufficientFilePermissions' }] } }
  expect((await classifyResponse(jsonResponse(403, body))).kind).toBe('forbidden')
  expect((await classifyResponse(new Response('<html>nope</html>', { status: 403 }))).kind).toBe('forbidden')
})

it('retries only rate limits and server errors', () => {
  const kinds = ['auth', 'rateLimit', 'server', 'notFound', 'forbidden', 'network', 'invalidFile', 'unknown'] as const
  const retryable = kinds.filter((kind) => isRetryable(new DriveError(kind, 'x')))
  expect(retryable).toEqual(['rateLimit', 'server'])
})
