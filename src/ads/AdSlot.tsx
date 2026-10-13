import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { loadAdsense, pushAd } from './adsense'
import { houseAd } from './house'
import { useAds } from './useAds'

const NO_FILL_TIMEOUT_MS = 5_000

type Placement = 'editor' | 'files'

function AdsenseUnit({ client, slot, placement, onFail }: { client: string; slot: string; placement: Placement; onFail(): void }) {
  const ref = useRef<HTMLModElement>(null)
  useEffect(() => {
    const ins = ref.current!
    let settled = false
    const fail = () => {
      if (settled) return
      settled = true
      onFail()
    }
    const check = () => {
      const status = ins.getAttribute('data-ad-status')
      if (status === 'unfilled') fail()
      else if (status) settled = true
    }
    const observer = new MutationObserver(check)
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    // A blocker can swallow the push without an error: no status after 5 s means no ad.
    const timer = setTimeout(() => {
      check() // a status that arrived since the last observer callback counts
      fail()
    }, NO_FILL_TIMEOUT_MS)
    loadAdsense(client).then(() => {
      if (!settled) pushAd(ins)
    }, fail)
    return () => {
      settled = true
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [client, onFail])
  return placement === 'editor' ? (
    <ins ref={ref} className="adsbygoogle" style={{ display: 'inline-block', width: 320, height: 50 }} data-ad-client={client} data-ad-slot={slot} />
  ) : (
    <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
  )
}

/** The ad space: AdSense, our own ad, or nothing for exempt accounts (spec 7). */
export function AdSlot({ placement, theme }: { placement: Placement; theme?: string }) {
  const { t } = useI18n()
  const { decision, adsense } = useAds()
  const [failed, setFailed] = useState(false)
  // Stable, or the AdsenseUnit effect would remount the <ins>. Declared before the early return (rules of hooks).
  const fail = useCallback(() => setFailed(true), [])
  if (decision === 'none') return null
  const house = houseAd(t)
  const useAdsense = decision === 'adsense' && adsense && !failed
  return (
    <aside className={`ad-slot ad-slot-${placement}`} data-theme={theme} data-ad-state={decision} aria-label={t.ads.label}>
      {decision !== 'pending' && <span className="ad-label">{t.ads.label}</span>}
      <div className="ad-body">
        {decision === 'pending' ? null : useAdsense ? (
          <AdsenseUnit client={adsense.client} slot={placement === 'editor' ? adsense.slots.editor : adsense.slots.files} placement={placement} onFail={fail} />
        ) : (
          <a className="house-ad" href={house.href} target="_blank" rel="noopener noreferrer">
            <span>{house.text}</span> <strong>{house.cta}</strong>
          </a>
        )}
      </div>
    </aside>
  )
}
