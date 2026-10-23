import { Dialog } from '../editor/Dialog'
import { useI18n } from '../i18n/useI18n'
import { whatsNewEntries } from './entries'

function formatDate(date: string, lang: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The news changelog, shown as a dialog over the current screen (it used to be a page). */
export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n()
  return (
    <Dialog title={t.whatsNew.title} onClose={onClose} closeLabel={t.whatsNew.close} className="whats-new">
      <p>{t.whatsNew.intro}</p>
      <ol className="whats-new-list">
        {whatsNewEntries.map((entry) => (
          <li key={entry.date}>
            <p className="whats-new-date">{formatDate(entry.date, lang)}</p>
            {entry.sections.map((slug) => {
              const section = t.whatsNew.sections[slug]
              return (
                <section key={slug}>
                  <h3>{section.title}</h3>
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
    </Dialog>
  )
}
