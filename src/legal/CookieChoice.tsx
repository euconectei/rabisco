import { useAds } from '../ads/useAds'
import { useI18n } from '../i18n/useI18n'

export function CookieChoice() {
  const { t } = useI18n()
  const { consent, setConsent } = useAds()
  return (
    <div className="cookie-choice">
      <p role="status">{t.legal.choice[consent ?? 'none']}</p>
      <div className="cookie-notice-actions">
        <button type="button" className="button-secondary" aria-pressed={consent === 'accepted'} onClick={() => setConsent('accepted')}>
          {t.cookies.accept}
        </button>
        <button type="button" className="button-secondary" aria-pressed={consent === 'declined'} onClick={() => setConsent('declined')}>
          {t.cookies.decline}
        </button>
      </div>
    </div>
  )
}
