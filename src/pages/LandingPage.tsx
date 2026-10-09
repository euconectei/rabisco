import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { AppFooter } from '../components/AppFooter'
import { useI18n } from '../i18n/useI18n'

export function LandingPage() {
  const { t } = useI18n()
  return (
    <main className="page landing">
      <h1>{t.app.name}</h1>
      <p>{t.app.tagline}</p>
      <Link className="button" to="/app">
        {t.landing.start}
      </Link>
      <LanguageSwitcher />
      <AppFooter />
    </main>
  )
}
