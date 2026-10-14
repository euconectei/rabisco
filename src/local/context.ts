import { createContext } from 'react'
import type { DriveClient } from '../drive/client'

/** The client for drawings kept in this browser; available in both modes (the Google mode lists them for "move to Drive"). */
export const LocalDriveContext = createContext<DriveClient | null>(null)
