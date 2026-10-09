export type DriveErrorKind =
  | 'auth'
  | 'rateLimit'
  | 'server'
  | 'notFound'
  | 'forbidden'
  | 'network'
  | 'invalidFile'
  | 'unknown'

export class DriveError extends Error {
  readonly kind: DriveErrorKind
  readonly status?: number

  constructor(kind: DriveErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'DriveError'
    this.kind = kind
    this.status = status
  }
}

const RATE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded'])

async function errorReason(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as { error?: { errors?: Array<{ reason?: string }> } }
    return body.error?.errors?.[0]?.reason
  } catch {
    return undefined
  }
}

export async function classifyResponse(response: Response): Promise<DriveError> {
  const { status } = response
  if (status === 401) return new DriveError('auth', 'Authorization expired', status)
  if (status === 404) return new DriveError('notFound', 'File not found', status)
  if (status === 429) return new DriveError('rateLimit', 'Too many requests', status)
  if (status >= 500) return new DriveError('server', `Drive error ${status}`, status)
  if (status === 403) {
    const reason = await errorReason(response)
    if (reason && RATE_LIMIT_REASONS.has(reason)) return new DriveError('rateLimit', 'Rate limit exceeded', status)
    return new DriveError('forbidden', 'Access denied', status)
  }
  return new DriveError('unknown', `Unexpected status ${status}`, status)
}

export function isRetryable(error: DriveError): boolean {
  return error.kind === 'rateLimit' || error.kind === 'server'
}
