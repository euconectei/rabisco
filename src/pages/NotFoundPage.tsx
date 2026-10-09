import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <main className="page">
      <h1>{t.notFound.title}</h1>
      <Link to="/">{t.notFound.backHome}</Link>
    </main>
  )
}
