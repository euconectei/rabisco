import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { format } from '../i18n/format'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { LEGAL_UPDATED } from './updated'

export function LegalPage({
  title,
  children,
  updated = LEGAL_UPDATED,
  home = '/',
  footer = <AppFooter />,
}: {
  title: string
  children: ReactNode
  /** YYYY-MM-DD shown under the title. */
  updated?: string
  /** Where "Back" goes when the page was opened directly. */
  home?: string
  footer?: ReactNode
}) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const { hash } = useLocation()

  // React Router does not scroll to #fragments by itself.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.()
  }, [hash])

  // React Router keeps the history index in history.state; 0 means the page was opened directly.
  const canGoBack = typeof window !== 'undefined' && ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  const date = new Date(`${updated}T00:00:00`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="page legal">
      <header className="page-header">
        <h1>{title}</h1>
        <button className="button-secondary" type="button" onClick={() => (canGoBack ? navigate(-1) : navigate(home))}>
          {t.legal.back}
        </button>
      </header>
      <p className="legal-updated">{format(t.legal.updated, { date })}</p>
      {children}
      <LanguageSwitcher />
      {footer}
    </main>
  )
}
