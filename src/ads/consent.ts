export type AdConsent = 'accepted' | 'declined'

const STORAGE_KEY = 'rabisco.adConsent'

/** The ad-cookie choice made in this browser (Brazil), or null when there is none. */
export function readConsent(): AdConsent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function writeConsent(value: AdConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable: the choice lives in memory (AdsProvider state) until the page closes.
  }
}
