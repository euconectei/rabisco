import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function NotFoundPage() {
  const { t } = useI18n()

  // Cloudflare Pages answers unknown paths with the landing HTML (status 200) so the SPA can route
  // them. Mark the rendered 404 as noindex so Google doesn't index it as a copy of the home page.
  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) return
    const previous = robots.content
    robots.content = 'noindex'
    return () => {
      robots.content = previous
    }
  }, [])

  return (
    <main className="page">
      <h1>{t.notFound.title}</h1>
      <Link to="/">{t.notFound.backHome}</Link>
    </main>
  )
}
