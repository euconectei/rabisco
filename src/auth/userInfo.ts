import type { AuthUser } from './context'

export const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export async function fetchGoogleUserInfo(accessToken: string): Promise<AuthUser> {
  const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error(`userinfo ${response.status}`)
  const body = (await response.json()) as { email?: string; name?: string; picture?: string }
  if (!body.email) throw new Error('userinfo without email')
  return { email: body.email, name: body.name ?? body.email, picture: body.picture }
}
