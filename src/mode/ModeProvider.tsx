import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { closeLocalDb, openLocalDb } from '../local/db'
import { ModeContext, type AppMode, type LocalSupport, type ModeValue } from './context'
import { readMode, writeMode } from './modeStorage'

/** Opens (and, the first time, creates) the local database; false when the browser refuses. */
async function openLocal(): Promise<boolean> {
  try {
    await openLocalDb()
    return true
  } catch {
    await closeLocalDb()
    return false
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  // Each tab keeps its own mode: the stored flag only decides where a freshly loaded page starts.
  const [mode, setMode] = useState<AppMode>(readMode)
  // Decided without touching the database, so visiting in the Google mode never creates it.
  const [localSupport, setLocalSupport] = useState<LocalSupport>(typeof indexedDB === 'undefined' ? 'unavailable' : 'available')

  // A page that starts in the local mode needs the database right away.
  useEffect(() => {
    if (mode !== 'local' || localSupport === 'unavailable') return
    let cancelled = false
    void openLocal().then((ok) => {
      if (!cancelled && !ok) setLocalSupport('unavailable')
    })
    return () => {
      cancelled = true
    }
  }, [mode, localSupport])

  const enterLocal = useCallback(() => {
    if (localSupport === 'unavailable') return
    void openLocal().then((ok) => {
      if (!ok) {
        // Blocked storage (a private window, for one): stay where we are and say it is unavailable.
        setLocalSupport('unavailable')
        return
      }
      writeMode('local')
      setMode('local')
    })
  }, [localSupport])

  const leaveLocal = useCallback(() => {
    writeMode('google')
    setMode('google')
  }, [])

  const value = useMemo<ModeValue>(() => ({ mode, localSupport, enterLocal, leaveLocal }), [mode, localSupport, enterLocal, leaveLocal])
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
