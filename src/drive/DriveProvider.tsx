import { useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { createDriveClient } from './client'
import { DriveContext } from './context'
import { createDriveFetch } from './http'

export function DriveProvider({ children }: { children: ReactNode }) {
  const { tokens } = useAuth()
  const drive = useMemo(() => createDriveClient(createDriveFetch(tokens)), [tokens])
  return <DriveContext.Provider value={drive}>{children}</DriveContext.Provider>
}
