import { useContext } from 'react'
import type { DriveClient } from './client'
import { DriveContext } from './context'

export function useDrive(): DriveClient {
  const drive = useContext(DriveContext)
  if (!drive) throw new Error('useDrive must be used inside <DriveProvider>')
  return drive
}
