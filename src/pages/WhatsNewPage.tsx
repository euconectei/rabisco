import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { latestWhatsNewDate, whatsNewEntries } from '../whatsNew/entries'
import { markWhatsNewSeen } from '../whatsNew/seen'

function formatDate(date: string, lang: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function WhatsNewPage() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    markWhatsNewSeen(latestWhatsNewDate)
  }, [])

  // React Router keeps the history index in history.state; 0 means the page was opened directly.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

  return (
    <main className="page whats-new">
      <header className="page-header">
        <h1>{t.whatsNew.title}</h1>
        <button className="button-secondary" type="button" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
          {t.whatsNew.back}
        </button>
      </header>
      <p>{t.whatsNew.intro}</p>
      <ol className="whats-new-list">
        {whatsNewEntries.map((entry) => (
          <li key={entry.date}>
            <p className="whats-new-date">{formatDate(entry.date, lang)}</p>
            {entry.sections.map((slug) => {
              const section = t.whatsNew.sections[slug]
              return (
                <section key={slug}>
                  <h2>{section.title}</h2>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </li>
        ))}
      </ol>
    </main>
  )
}
