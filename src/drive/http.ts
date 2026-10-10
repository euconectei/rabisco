import { classifyResponse, DriveError, isRetryable } from './errors'

export interface TokenSource {
  getToken(): Promise<string>
  refreshToken(): Promise<string>
}

export interface DriveFetchOptions {
  retryDelaysMs?: readonly number[]
  sleep?: (ms: number) => Promise<void>
}

export type DriveFetch = (url: string, init?: RequestInit) => Promise<Response>

export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createDriveFetch(tokens: TokenSource, options: DriveFetchOptions = {}): DriveFetch {
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS
  const sleep = options.sleep ?? defaultSleep

  async function send(url: string, init: RequestInit, token: string): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    try {
      return await fetch(url, { ...init, headers })
    } catch {
      throw new DriveError('network', 'Network unavailable')
    }
  }

  return async function driveFetch(url, init = {}) {
    let token = await tokens.getToken()
    let refreshed = false
    let retries = 0
    for (;;) {
      const response = await send(url, init, token)
      if (response.ok) return response
      const error = await classifyResponse(response)
      if (error.kind === 'auth' && !refreshed) {
        refreshed = true
        token = await tokens.refreshToken()
        continue
      }
      if (isRetryable(error) && retries < delays.length) {
        await sleep(delays[retries])
        retries += 1
        continue
      }
      throw error
    }
  }
}
