import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { closeLocalDb, openLocalDb } from '../local/db'
import { ModeContext, type AppMode, type LocalSupport, type ModeValue } from './context'
import { MODE_STORAGE_KEY, readMode, writeMode } from './modeStorage'

/** Whether this browser can open the local database (blocked storage, some private windows, no IndexedDB). */
async function probeLocalSupport(): Promise<boolean> {
  try {
    await openLocalDb()
    return true
  } catch {
    await closeLocalDb()
    return false
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(readMode)
  const [localSupport, setLocalSupport] = useState<LocalSupport>('checking')

  useEffect(() => {
    let cancelled = false
    void probeLocalSupport().then((ok) => {
      if (!cancelled) setLocalSupport(ok ? 'available' : 'unavailable')
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Another tab entering or leaving the local mode moves this one along.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === MODE_STORAGE_KEY || event.key === null) setMode(readMode())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const enterLocal = useCallback(() => {
    if (localSupport === 'unavailable') return
    writeMode('local')
    setMode('local')
  }, [localSupport])

  const leaveLocal = useCallback(() => {
    writeMode('google')
    setMode('google')
  }, [])

  const value = useMemo<ModeValue>(() => ({ mode, localSupport, enterLocal, leaveLocal }), [mode, localSupport, enterLocal, leaveLocal])
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
