const STORAGE_KEY = 'rabisco.whatsNew.lastSeen'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function hasUnseenWhatsNew(latestDate: string | undefined): boolean {
  if (!latestDate) return false
  try {
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    return !lastSeen || !DATE_PATTERN.test(lastSeen) || lastSeen < latestDate
  } catch {
    // Storage unavailable: we cannot remember, so do not nag with a permanent dot.
    return false
  }
}

export function markWhatsNewSeen(latestDate: string | undefined): void {
  if (!latestDate) return
  try {
    localStorage.setItem(STORAGE_KEY, latestDate)
  } catch {
    // Storage unavailable: nothing to remember.
  }
}
