import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { latestWhatsNewDate } from '../whatsNew/entries'
import { hasUnseenWhatsNew } from '../whatsNew/seen'
import { REPOSITORY_URL } from './links'

export function AppFooter() {
  const { t } = useI18n()
  const unseen = hasUnseenWhatsNew(latestWhatsNewDate)
  return (
    <footer className="app-footer">
      <span>v{__APP_VERSION__}</span>
      <span aria-hidden="true">·</span>
      <Link to="/whats-new" aria-label={unseen ? t.whatsNew.linkUnseen : t.whatsNew.link}>
        {t.whatsNew.link}
        {unseen && <span className="unseen-dot" aria-hidden="true" />}
      </Link>
      <span aria-hidden="true">·</span>
      <span>
        {t.footer.madeBy}{' '}
        <span className="heartbeat" role="img" aria-label={t.footer.love}>
          ❤️
        </span>
      </span>
      <span aria-hidden="true">·</span>
      <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
        GitHub
      </a>
    </footer>
  )
}
