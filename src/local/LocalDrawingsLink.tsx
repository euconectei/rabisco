import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { useLocalDrawings } from './useLocalDrawings'
import './local.css'

/** In the Google mode: a quiet way back to the drawings still kept in this browser, while there are any. */
export function LocalDrawingsLink() {
  const { t } = useI18n()
  const { drawings } = useLocalDrawings()
  if (drawings.kind !== 'ready' || drawings.files.length === 0) return null
  return (
    <p className="local-drawings-link">
      <Link to="/local">{t.files.localDrawings}</Link>
    </p>
  )
}
