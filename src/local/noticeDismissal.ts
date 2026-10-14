const KEY = 'rabisco.localNotice'

let dismissedInMemory = false

/** Whether the local-mode notice was dismissed during this browser session. */
export function localNoticeDismissed(): boolean {
  if (dismissedInMemory) return true
  try {
    return sessionStorage.getItem(KEY) === 'dismissed'
  } catch {
    return false
  }
}

export function dismissLocalNotice(): void {
  dismissedInMemory = true
  try {
    sessionStorage.setItem(KEY, 'dismissed')
  } catch {
    // Without sessionStorage the choice only lasts while this page stays open.
  }
}

/** Test seam. */
export function resetLocalNoticeDismissal(): void {
  dismissedInMemory = false
}
