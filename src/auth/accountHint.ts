// Remembers who was signed in (name and email only, never the token) so a reload can offer
// "Continue as <name>" with a login hint instead of the full consent screen.
const STORAGE_KEY = 'rabisco.account'

export interface AccountHint {
  email: string
  name: string
}

export function readAccountHint(): AccountHint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { email, name } = value as Record<string, unknown>
    if (typeof email !== 'string' || typeof name !== 'string' || !email) return null
    return { email, name }
  } catch {
    return null
  }
}

export function writeAccountHint({ email, name }: AccountHint): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, name }))
  } catch {
    // Storage unavailable: the next visit just shows the regular sign-in button.
  }
}

export function clearAccountHint(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored or storage unavailable.
  }
}
