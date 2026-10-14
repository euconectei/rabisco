import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useI18n } from '../i18n/useI18n'
import { useMode } from '../mode/useMode'
import { isLocalId } from './ids'
import { LocalSignIn } from './LocalSignIn'
import './local.css'

/**
 * A quiet reminder that these drawings live only in this browser. On the files page (no `fileId`) it
 * follows the mode; in the editor it follows the open drawing, so it also shows for a local drawing
 * opened after signing in.
 */
export function LocalNotice({ fileId }: { fileId?: string }) {
  const { t } = useI18n()
  const { mode } = useMode()
  const auth = useAuth()
  const applies = fileId === undefined ? mode === 'local' : isLocalId(fileId)
  if (!applies) return null
  const signedIn = auth.status === 'signed-in'
  return (
    <aside className="local-notice" aria-label={t.local.noticeLabel}>
      <p className="local-notice-text">
        <span>{t.local.notice}</span> <span className="local-notice-detail">{t.local.noticeDetail}</span>
      </p>
      {signedIn ? (
        <Link className="local-notice-action" to="/local">
          {t.files.localDrawings}
        </Link>
      ) : (
        <LocalSignIn className="button-secondary local-notice-action" />
      )}
    </aside>
  )
}
