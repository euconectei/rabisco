import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { WhatsNewContext } from './context'
import { latestWhatsNewDate } from './entries'
import { markWhatsNewSeen } from './seen'
import { WhatsNewModal } from './WhatsNewModal'

/**
 * Holds the news modal for the whole app: any "Novidades" trigger opens it over the current screen
 * (no route change). The /whats-new page stays as the standalone, prerendered version for search.
 */
export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Mark the latest entry as seen as the modal opens, so the footer's unseen dot clears right away.
  const openNews = useCallback(() => {
    markWhatsNewSeen(latestWhatsNewDate)
    setOpen(true)
  }, [])
  const value = useMemo(() => ({ open, openNews }), [open, openNews])
  return (
    <WhatsNewContext.Provider value={value}>
      {children}
      {open && <WhatsNewModal onClose={() => setOpen(false)} />}
    </WhatsNewContext.Provider>
  )
}
