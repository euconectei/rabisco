import { parseUsageEvent, toDataPoint, type UsageDataPoint } from './schema'

export interface UsageSink {
  writeDataPoint(point: UsageDataPoint): void
}

const MAX_BODY_BYTES = 1024

/**
 * The work of /api/event (functions/api/event.ts): answers 204 to any POST (405 to other methods),
 * so the browser learns nothing and never retries; anything that is not a known event is dropped.
 */
export async function handleUsageRequest(request: Request, sink: UsageSink | undefined, knownTemplates: readonly string[]): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  // A declared size over the limit is refused before reading anything.
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return new Response(null, { status: 204 })
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).length <= MAX_BODY_BYTES) {
      const event = parseUsageEvent(JSON.parse(text), knownTemplates)
      if (event) sink?.writeDataPoint(toDataPoint(event))
    }
  } catch {
    // A malformed body is just not counted.
  }
  return new Response(null, { status: 204 })
}
