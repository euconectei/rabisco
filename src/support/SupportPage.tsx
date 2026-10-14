import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { REPOSITORY_URL } from '../components/links'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { PIX_KEY, pixPayload } from './pix'

/** The Pix QR code is drawn here, in the browser: nothing about the visit goes anywhere. */
export default function SupportPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const payload = useMemo(() => pixPayload(), [])
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    void import('qrcode')
      .then(({ default: QRCode }) => QRCode.toString(payload, { type: 'svg', margin: 1, width: 240 }))
      .then((svg) => {
        if (!cancelled) setQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [payload])

  // React Router keeps the history index in history.state; 0 means the page was opened directly.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="page legal support">
      <header className="page-header">
        <h1>{t.support.title}</h1>
        <button className="button-secondary" type="button" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
          {t.legal.back}
        </button>
      </header>
      <p>{t.support.intro}</p>
      <h2>{t.support.pixTitle}</h2>
      <p>{t.support.pixText}</p>
      <div className="support-pix">
        {qr && <img src={qr} width="240" height="240" alt={t.support.qrAlt} />}
        <div className="support-pix-side">
          <button type="button" className="button" onClick={() => void copy()}>
            {t.support.copy}
          </button>
          <p role="status" className="support-copied">
            {copied ? t.support.copied : ''}
          </p>
          <p className="support-key">
            {t.support.keyLabel}: <code>{PIX_KEY}</code>
          </p>
        </div>
      </div>
      <h2>{t.support.otherTitle}</h2>
      <p>
        {t.support.otherText}{' '}
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          {t.support.repository}
        </a>
      </p>
      <LanguageSwitcher />
      <AppFooter />
    </main>
  )
}
