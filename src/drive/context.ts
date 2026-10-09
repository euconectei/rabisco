import { createContext } from 'react'
import type { DriveClient } from './client'

export const DriveContext = createContext<DriveClient | null>(null)
