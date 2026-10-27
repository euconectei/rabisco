// POST /api/event: anonymous usage counts from the editor. The rules live in src/usage/ (tested there).
import { TEMPLATES } from '../../src/templates/registry'
import { handleUsageRequest, type UsageSink } from '../../src/usage/endpoint'

interface Env {
  /** Workers Analytics Engine dataset `rabisco_usage` (wrangler.toml); absent in local previews. */
  USAGE?: UsageSink
}

const TEMPLATE_IDS = TEMPLATES.map((template) => template.id)

export function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  return handleUsageRequest(request, env.USAGE, TEMPLATE_IDS)
}
