import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { useAds } from './useAds'

/** Brazil (LGPD): a non-blocking bar; AdSense loads only after "Accept" (spec 7.4). */
export function CookieNotice({ theme }: { theme?: string }) {
  const { t } = useI18n()
  const { showCookieNotice, setConsent } = useAds()
  if (!showCookieNotice) return null
  return (
    <section className="cookie-notice" data-theme={theme} aria-label={t.cookies.title}>
      <p>{t.cookies.text}</p>
      <div className="cookie-notice-actions">
        <button type="button" className="button-secondary" onClick={() => setConsent('accepted')}>
          {t.cookies.accept}
        </button>
        <button type="button" className="button-secondary" onClick={() => setConsent('declined')}>
          {t.cookies.decline}
        </button>
        <Link to="/privacy#cookies">{t.cookies.learnMore}</Link>
      </div>
    </section>
  )
}
