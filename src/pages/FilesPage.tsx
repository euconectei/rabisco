import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { AppFooter } from '../components/AppFooter'
import { useI18n } from '../i18n/useI18n'

export function FilesPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <main className="page">
      <header className="page-header">
        <h1>{t.files.title}</h1>
        <LanguageSwitcher />
      </header>
      <button className="button" type="button" onClick={() => navigate('/edit/new')}>
        {t.files.new}
      </button>
      <p>{t.files.empty}</p>
      <AppFooter />
    </main>
  )
}
