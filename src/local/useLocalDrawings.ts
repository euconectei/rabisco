import { useCallback, useEffect, useState } from 'react'
import type { DriveFileMeta } from '../drive/client'
import { localDbExists } from './db'
import { useLocalDrive } from './useLocalDrive'

export type LocalDrawings = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; files: DriveFileMeta[] }

/** The drawings kept in this browser, newest first. */
export function useLocalDrawings(): { drawings: LocalDrawings; reload(): Promise<void> } {
  const local = useLocalDrive()
  const [drawings, setDrawings] = useState<LocalDrawings>({ kind: 'loading' })

  const load = useCallback(async (): Promise<LocalDrawings> => {
    try {
      // Listing would create the database; whoever only uses the Drive must not get one.
      if (!(await localDbExists())) return { kind: 'ready', files: [] }
      return { kind: 'ready', files: await local.listFiles() }
    } catch {
      return { kind: 'error' }
    }
  }, [local])

  useEffect(() => {
    let cancelled = false
    void load().then((next) => {
      if (!cancelled) setDrawings(next)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const reload = useCallback(async () => setDrawings(await load()), [load])
  return { drawings, reload }
}
