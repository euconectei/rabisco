import { parseUsageEvent, toDataPoint, type UsageDataPoint } from './schema'

export interface UsageSink {
  writeDataPoint(point: UsageDataPoint): void
}

const MAX_BODY_BYTES = 1024

/**
 * The work of POST /api/event (functions/api/event.ts): answers 204 whatever happens, so the browser
 * learns nothing and never retries; anything that is not a known event is dropped.
 */
export async function handleUsageRequest(request: Request, sink: UsageSink | undefined, knownTemplates: readonly string[]): Promise<Response> {
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
