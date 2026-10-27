import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { useWhatsNew } from '../whatsNew/context'
import { latestWhatsNewDate } from '../whatsNew/entries'
import { hasUnseenWhatsNew } from '../whatsNew/seen'
import { templatesIndexPath } from '../templates/paths'
import { REPOSITORY_URL } from './links'

export function AppFooter() {
  const { lang, t } = useI18n()
  const { openNews } = useWhatsNew()
  const unseen = hasUnseenWhatsNew(latestWhatsNewDate)
  return (
    <footer className="app-footer">
      <span>v{__APP_VERSION__}</span>
      <span aria-hidden="true">·</span>
      {/* A real link keeps /whats-new crawlable; in the app it opens the modal instead of navigating. */}
      <Link
        to="/whats-new"
        onClick={(event) => {
          event.preventDefault()
          openNews()
        }}
        aria-label={unseen ? t.whatsNew.linkUnseen : t.whatsNew.link}
      >
        {t.whatsNew.link}
        {unseen && <span className="unseen-dot" aria-hidden="true" />}
      </Link>
      <span aria-hidden="true">·</span>
      <Link to={templatesIndexPath(lang)}>{t.footer.templates}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/docs/import">{t.footer.aiDocs}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/privacy">{t.footer.privacy}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/terms">{t.footer.terms}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/privacy#cookies">{t.footer.cookies}</Link>
      <span aria-hidden="true">·</span>
      <Link to="/apoie">{t.footer.support}</Link>
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
