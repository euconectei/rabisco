import { createContext } from 'react'

export type AppMode = 'google' | 'local'

/** Whether the browser can keep drawings locally: 'checking' while IndexedDB is being probed. */
export type LocalSupport = 'checking' | 'available' | 'unavailable'

export interface ModeValue {
  mode: AppMode
  localSupport: LocalSupport
  /** Switches to the local mode (keeps `rabisco.mode` = `local`). */
  enterLocal(): void
  /** Back to the Google mode (clears `rabisco.mode`). */
  leaveLocal(): void
}

export const ModeContext = createContext<ModeValue | null>(null)
