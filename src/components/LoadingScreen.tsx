import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

// Under this a load is over before anyone reads the screen: showing it would only flash.
const SHOW_AFTER_MS = 200
const SLOW_AFTER_MS = 8000
// Creating a drawing goes through several loading screens in a row; one seen this recently carries on without the wait.
const SAME_FLOW_MS = 1000

let lastSeenAt = Number.NEGATIVE_INFINITY

/** A hand-drawn mind map whose nodes light up one after the other. */
function LoadingArt() {
  return (
    <svg className="status-art" viewBox="0 0 160 100" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.5">
        <path d="M80 52C62 42 48 32 38 22" />
        <path d="M80 52C98 46 112 40 124 30" />
        <path d="M80 52C96 64 110 72 122 80" />
        <rect x="60" y="40" width="40" height="24" rx="7" fill="Canvas" />
      </g>
      <g stroke="currentColor" strokeWidth="2" fill="Canvas">
        <rect className="status-node" x="14" y="8" width="34" height="18" rx="6" />
        <rect className="status-node" x="112" y="14" width="34" height="18" rx="6" />
        <rect className="status-node" x="110" y="72" width="34" height="18" rx="6" />
      </g>
    </svg>
  )
}

function ErrorArt() {
  return (
    <svg className="status-art" viewBox="0 0 160 100" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.5">
        <path d="M80 52C62 42 48 32 38 22" strokeDasharray="2 7" />
        <path d="M80 52C98 46 112 40 124 30" />
        <path d="M80 52C96 64 110 72 122 80" strokeDasharray="2 7" />
        <rect x="60" y="40" width="40" height="24" rx="7" fill="Canvas" />
        <path d="M72 47l16 10M88 47L72 57" />
      </g>
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" fill="Canvas">
        <rect x="14" y="8" width="34" height="18" rx="6" />
        <rect x="112" y="14" width="34" height="18" rx="6" />
        <rect x="110" y="72" width="34" height="18" rx="6" />
      </g>
    </svg>
  )
}

/**
 * The wait for a drawing (or a page) to be ready. It stays out of sight for the first moments, takes
 * over without a gap when it follows another one, and offers a way out when the wait drags on.
 */
export function LoadingScreen({
  title,
  detail,
  image,
  back = true,
}: {
  title: string
  detail?: string
  /** A picture of what is being made (the template's preview). */
  image?: string
  /** Whether the "taking longer" notice offers a way back to the files. */
  back?: boolean
}) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(() => Date.now() - lastSeenAt < SAME_FLOW_MS)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (visible) return
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(show)
  }, [visible])

  useEffect(() => {
    const late = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(late)
  }, [])

  useEffect(() => {
    if (!visible) return
    lastSeenAt = Date.now()
    return () => {
      lastSeenAt = Date.now()
    }
  }, [visible])

  if (!visible) return null
  return (
    <main className="status-screen" role="status" aria-live="polite">
      {image ? <img className="status-image" src={image} alt="" /> : <LoadingArt />}
      <p className="status-title">{title}</p>
      {detail ? <p className="status-detail">{detail}</p> : null}
      {slow ? (
        <div className="status-slow">
          <p>{t.loading.slow}</p>
          {back ? <Link to="/app">{t.editor.backToFiles}</Link> : null}
        </div>
      ) : null}
    </main>
  )
}

/** The same screen when the wait ended badly; the actions (retry, go back) come as children. */
export function ErrorScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="status-screen status-error" role="alert">
      <ErrorArt />
      <p className="status-title">{title}</p>
      {children ? <div className="status-actions">{children}</div> : null}
    </main>
  )
}
