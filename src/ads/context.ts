import { createContext } from 'react'
import type { AdsenseConfig } from './config'
import type { AdConsent } from './consent'
import type { AdDecision } from './decision'

export interface AdsValue {
  decision: AdDecision
  showCookieNotice: boolean
  consent: AdConsent | null
  setConsent(value: AdConsent): void
  adsense: AdsenseConfig | null
}

export const AdsContext = createContext<AdsValue | null>(null)
