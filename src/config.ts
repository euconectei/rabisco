export interface GoogleConfig {
  clientId: string
  apiKey: string
  appId: string
}

type Env = Record<string, string | undefined>

// The values are public by design (they ship in the bundle) and are locked down by origin and API
// restrictions in Google Cloud. Without them the app shows "sign-in unavailable" instead of breaking.
export function googleConfig(env: Env = import.meta.env as Env): GoogleConfig | null {
  const clientId = env.VITE_GOOGLE_CLIENT_ID?.trim()
  const apiKey = env.VITE_GOOGLE_API_KEY?.trim()
  const appId = env.VITE_GOOGLE_APP_ID?.trim()
  if (!clientId || !apiKey || !appId) return null
  return { clientId, apiKey, appId }
}
