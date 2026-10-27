import { handleUsageRequest } from './endpoint'

const event = { type: 'drawing_returned', template: null, mode: 'local', lang: 'pt-BR' }
const post = (body: string) => new Request('https://rabisco.dev/api/event', { method: 'POST', body })

it('writes a known event and answers 204', async () => {
  const sink = { writeDataPoint: vi.fn() }
  const response = await handleUsageRequest(post(JSON.stringify(event)), sink, [])
  expect(response.status).toBe(204)
  expect(sink.writeDataPoint).toHaveBeenCalledWith({ indexes: ['drawing_returned'], blobs: ['drawing_returned', '', '', 'local', 'pt-BR'], doubles: [1] })
})

it.each([
  ['not JSON', 'oi'],
  ['an unknown event', JSON.stringify({ ...event, type: 'click' })],
  ['a body over 1 KB', JSON.stringify({ ...event, pad: 'x'.repeat(2000) })],
])('drops %s and still answers 204', async (_case, body) => {
  const sink = { writeDataPoint: vi.fn() }
  expect((await handleUsageRequest(post(body), sink, [])).status).toBe(204)
  expect(sink.writeDataPoint).not.toHaveBeenCalled()
})

it('answers 204 without a dataset (local previews)', async () => {
  expect((await handleUsageRequest(post(JSON.stringify(event)), undefined, [])).status).toBe(204)
})
