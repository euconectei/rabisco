import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

/** Reads the `state` that Drive's "Open with" sends: {"ids":["<fileId>"],"action":"open",...}. */
export function parseOpenState(raw: string | null): string | null {
  if (!raw) return null
  try {
    const state = JSON.parse(raw) as { ids?: unknown }
    const id = Array.isArray(state.ids) ? state.ids[0] : undefined
    return typeof id === 'string' && id ? id : null
  } catch {
    return null
  }
}

export function OpenFromDrivePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileId = parseOpenState(params.get('state'))

  useEffect(() => {
    if (fileId) navigate(`/edit/${encodeURIComponent(fileId)}`, { replace: true })
  }, [fileId, navigate])

  if (fileId) return null
  return (
    <main className="page">
      <p>{t.open.failed}</p>
      <Link to="/app">{t.editor.backToFiles}</Link>
    </main>
  )
}
