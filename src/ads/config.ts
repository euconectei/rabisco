export interface AdsenseConfig {
  client: string
  slots: { editor: string; files: string }
}

type Env = Record<string, string | undefined>

// Public by design, like the Google keys. Without all three values the app shows only the house ad.
export function adsenseConfig(env: Env = import.meta.env as Env): AdsenseConfig | null {
  const client = env.VITE_ADSENSE_CLIENT?.trim()
  const editor = env.VITE_ADSENSE_SLOT_EDITOR?.trim()
  const files = env.VITE_ADSENSE_SLOT_FILES?.trim()
  if (!client || !editor || !files) return null
  return { client, slots: { editor, files } }
}
