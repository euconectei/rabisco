import type { AppMode } from './context'

export const MODE_STORAGE_KEY = 'rabisco.mode'

// When the browser refuses to store the choice (private window, blocked storage) it still holds
// for this page session, so nobody is stuck in a mode they cannot leave or enter.
let memoryMode: AppMode | null = null

export function readMode(): AppMode {
  if (memoryMode) return memoryMode
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'local' ? 'local' : 'google'
  } catch {
    return 'google'
  }
}

export function writeMode(mode: AppMode): void {
  try {
    if (mode === 'local') localStorage.setItem(MODE_STORAGE_KEY, 'local')
    else localStorage.removeItem(MODE_STORAGE_KEY)
    memoryMode = null
  } catch {
    memoryMode = mode
  }
}

/** Test seam: forgets the in-memory fallback. */
export function resetModeMemory(): void {
  memoryMode = null
}
