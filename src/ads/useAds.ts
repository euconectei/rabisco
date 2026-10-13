import { useContext } from 'react'
import { AdsContext, type AdsValue } from './context'
import type { AdDecision } from './decision'

export function useAds(): AdsValue {
  const value = useContext(AdsContext)
  if (!value) throw new Error('useAds must be used inside <AdsProvider>')
  return value
}

export function useAdDecision(): AdDecision {
  return useAds().decision
}
