import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { adsenseConfig, type AdsenseConfig } from './config'
import { readConsent, writeConsent, type AdConsent } from './consent'
import { AdsContext } from './context'
import { decideAd, needsCookieNotice } from './decision'
import { EXEMPT_HASHES, isExempt } from './exempt'
import { adRegion, browserTimeZone } from './region'

interface Props {
  children: ReactNode
  timeZone?: string
  adsense?: AdsenseConfig | null
  exemptHashes?: readonly string[]
}

export function AdsProvider({ children, timeZone = browserTimeZone(), adsense = adsenseConfig(), exemptHashes = EXEMPT_HASHES }: Props) {
  const email = useAuth().user?.email ?? null
  // Tagged with the email it was computed for, so a new account never inherits the previous answer.
  const [exemption, setExemption] = useState<{ email: string; exempt: boolean } | null>(null)
  const [consent, setConsentState] = useState<AdConsent | null>(readConsent)

  useEffect(() => {
    if (!email) return
    let cancelled = false
    void isExempt(email, exemptHashes).then((exempt) => {
      if (!cancelled) setExemption({ email, exempt })
    })
    return () => {
      cancelled = true
    }
  }, [email, exemptHashes])

  const setConsent = useCallback((value: AdConsent) => {
    writeConsent(value)
    setConsentState(value)
  }, [])

  const value = useMemo(() => {
    const exempt = email && exemption?.email === email ? exemption.exempt : null
    const inputs = { exempt, region: adRegion(timeZone), adsenseConfigured: adsense !== null, consent }
    return { decision: decideAd(inputs), showCookieNotice: needsCookieNotice(inputs), consent, setConsent, adsense }
  }, [email, exemption, timeZone, adsense, consent, setConsent])

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>
}
