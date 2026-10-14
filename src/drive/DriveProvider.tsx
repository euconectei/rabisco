import { useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { createLocalDriveClient } from '../local/client'
import { LocalDriveContext } from '../local/context'
import { createRoutingClient } from '../local/routing'
import { ModeContext } from '../mode/context'
import { createDriveClient } from './client'
import { DriveContext } from './context'
import { createDriveFetch } from './http'

export function DriveProvider({ children }: { children: ReactNode }) {
  const { tokens } = useAuth()
  const mode = useContext(ModeContext)?.mode ?? 'google'
  const local = useMemo(() => createLocalDriveClient(), [])
  // In the local mode nothing may reach Google, so the client is the local one alone. Otherwise ids
  // decide: `local-…` drawings stay in this browser (still listed and openable after signing in), the rest is Drive.
  const drive = useMemo(
    () => (mode === 'local' ? local : createRoutingClient(local, createDriveClient(createDriveFetch(tokens)))),
    [mode, local, tokens],
  )
  return (
    <LocalDriveContext.Provider value={local}>
      <DriveContext.Provider value={drive}>{children}</DriveContext.Provider>
    </LocalDriveContext.Provider>
  )
}
