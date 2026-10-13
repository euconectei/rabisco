import type { AdConsent } from './consent'
import type { AdRegion } from './region'

/**
 * pending: exemption still being computed (reserve the space, load nothing).
 * none: exempt account (no slot, no script, no notice).
 * house: our own cookie-free ad. adsense: Google AdSense.
 */
export type AdDecision = 'pending' | 'none' | 'house' | 'adsense'

export interface AdInputs {
  /** null while the email hash is being computed. */
  exempt: boolean | null
  region: AdRegion
  adsenseConfigured: boolean
  consent: AdConsent | null
}

// The first rule that applies wins, so exemption holds in every region.
export function decideAd({ exempt, region, adsenseConfigured, consent }: AdInputs): AdDecision {
  if (exempt === null) return 'pending'
  if (exempt) return 'none'
  if (!adsenseConfigured || region === 'europe') return 'house'
  if (region === 'brazil' && consent !== 'accepted') return 'house'
  return 'adsense'
}

/** Brazil (LGPD): ask once, and only when there is something to consent to. */
export function needsCookieNotice({ exempt, region, adsenseConfigured, consent }: AdInputs): boolean {
  return exempt === false && region === 'brazil' && adsenseConfigured && consent === null
}
