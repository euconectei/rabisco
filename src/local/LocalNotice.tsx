import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useI18n } from '../i18n/useI18n'
import { useMode } from '../mode/useMode'
import { isLocalId } from './ids'
import { LocalSignIn } from './LocalSignIn'
import { dismissLocalNotice, localNoticeDismissed } from './noticeDismissal'
import './local.css'

/**
 * A quiet reminder that these drawings live only in this browser, which can be dismissed for the
 * session. On the files page (no `fileId`) it follows the mode; in the editor it follows the open
 * drawing, so it also shows for a local drawing opened after signing in. Over the editor the styles
 * shrink it to a small chip with a shorter text, so it never covers the menu or the canvas.
 */
export function LocalNotice({ fileId }: { fileId?: string }) {
  const { t } = useI18n()
  const { mode } = useMode()
  const auth = useAuth()
  const [dismissed, setDismissed] = useState(() => localNoticeDismissed())
  const applies = fileId === undefined ? mode === 'local' : isLocalId(fileId)
  if (!applies || dismissed) return null
  const signedIn = auth.status === 'signed-in'
  return (
    <aside className="local-notice" aria-label={t.local.noticeLabel}>
      <p className="local-notice-text">
        <span className="local-notice-full">{t.local.notice}</span>
        <span className="local-notice-short">{t.local.noticeShort}</span> <span className="local-notice-detail">{t.local.noticeDetail}</span>
      </p>
      {signedIn ? (
        <Link className="local-notice-action" to="/local">
          {t.files.localDrawings}
        </Link>
      ) : (
        <LocalSignIn className="button-secondary local-notice-action" />
      )}
      <button
        type="button"
        className="local-notice-close"
        aria-label={t.local.dismiss}
        onClick={() => {
          dismissLocalNotice()
          setDismissed(true)
        }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  )
}
