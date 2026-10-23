import { createContext, useContext } from 'react'

export interface WhatsNewValue {
  /** Whether the news modal is open. */
  open: boolean
  /** Opens the news modal (and marks the latest entry as seen). */
  openNews: () => void
}

// Default is a no-op so a component can render outside the provider (e.g. in an isolated test).
export const WhatsNewContext = createContext<WhatsNewValue>({ open: false, openNews: () => {} })

export function useWhatsNew(): WhatsNewValue {
  return useContext(WhatsNewContext)
}
