import { useContext } from 'react'
import { ModeContext, type ModeValue } from './context'

export function useMode(): ModeValue {
  const value = useContext(ModeContext)
  if (!value) throw new Error('useMode must be used inside <ModeProvider>')
  return value
}
