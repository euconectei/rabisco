export const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
// drive.install only registers Rabisco in Drive's "Open with" menu; it grants no file access.
export const DRIVE_INSTALL_SCOPE = 'https://www.googleapis.com/auth/drive.install'
export const SCOPES = `${DRIVE_SCOPE} ${DRIVE_INSTALL_SCOPE} openid email profile`

export interface TokenResponse {
  accessToken: string
  expiresInSec: number
  /** What the person actually granted: Google's consent screen lets them untick scopes. */
  grantedScopes: string[]
}

export interface IdentityClient {
  requestToken(options: { prompt: '' | 'consent'; loginHint?: string }): Promise<TokenResponse>
  revoke(accessToken: string): Promise<void>
}

interface GisTokenResponse {
  access_token?: string
  expires_in?: number | string
  scope?: string
  error?: string
}

interface GisOauth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: GisTokenResponse) => void
    error_callback: (error: { type: string }) => void
  }): { requestAccessToken(options: { prompt: string; login_hint?: string }): void }
  revoke(token: string, done: () => void): void
}

function oauth2(): GisOauth2 {
  const api = (window as unknown as { google?: { accounts?: { oauth2?: GisOauth2 } } }).google?.accounts?.oauth2
  if (!api) throw new Error('Google sign-in could not be loaded')
  return api
}

let scriptLoading: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      scriptLoading = null
      reject(new Error('Google sign-in could not be loaded'))
    })
    document.head.appendChild(script)
  })
  return scriptLoading
}

export function resetIdentityLoaderForTests(): void {
  scriptLoading = null
}

export async function loadIdentityClient(clientId: string): Promise<IdentityClient> {
  await loadScript()
  return {
    requestToken({ prompt, loginHint }) {
      return new Promise<TokenResponse>((resolve, reject) => {
        // A fresh token client per request keeps each promise tied to its own callback.
        const client = oauth2().initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error ?? 'no_token'))
              return
            }
            resolve({
              accessToken: response.access_token,
              expiresInSec: Number(response.expires_in ?? 3600),
              grantedScopes: (response.scope ?? SCOPES).split(' ').filter(Boolean),
            })
          },
          error_callback: (error) => reject(new Error(error.type)),
        })
        client.requestAccessToken({ prompt, login_hint: loginHint })
      })
    },
    revoke(accessToken) {
      return new Promise<void>((resolve) => oauth2().revoke(accessToken, () => resolve()))
    },
  }
}
