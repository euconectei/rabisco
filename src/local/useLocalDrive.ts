import { useContext } from 'react'
import type { DriveClient } from '../drive/client'
import { LocalDriveContext } from './context'

export function useLocalDrive(): DriveClient {
  const drive = useContext(LocalDriveContext)
  if (!drive) throw new Error('useLocalDrive must be used inside <DriveProvider>')
  return drive
}
