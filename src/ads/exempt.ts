// SHA-256 (hex) of normalized emails whose accounts see no ads. Contributors with an accepted
// pull request may add their own (see CONTRIBUTING.md, `pnpm hash-email`).
export const EXEMPT_HASHES: readonly string[] = [
  '2d91b1bc14aa946a85929d2d1986628ebb8aa1992214565d8cc71eb5f889a26c', // owner
]

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function hashEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeEmail(email)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Never throws: if hashing fails, the account is treated as not exempt. */
export async function isExempt(email: string, hashes: readonly string[] = EXEMPT_HASHES): Promise<boolean> {
  try {
    return hashes.includes(await hashEmail(email))
  } catch {
    return false
  }
}
