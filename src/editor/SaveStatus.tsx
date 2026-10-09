import { useI18n } from '../i18n/useI18n'
import type { SaveStatus as Status } from './saveQueue'

interface Props {
  status: Status
  lost: boolean
  onRetry(): void
  onSaveAsNew(): void
}

export function SaveStatus({ status, lost, onRetry, onSaveAsNew }: Props) {
  const { t } = useI18n()
  if (status === 'error' && lost) {
    return (
      <p className="save-status save-status-error" role="status">
        {t.editor.status.lost}{' '}
        <button type="button" className="button-link" onClick={onSaveAsNew}>
          {t.editor.saveAsNew}
        </button>
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p className="save-status save-status-error" role="status">
        {t.editor.status.error}{' '}
        <button type="button" className="button-link" onClick={onRetry}>
          {t.editor.retry}
        </button>
      </p>
    )
  }
  const text = status === 'needs-auth' ? t.editor.status.needsAuth : t.editor.status[status]
  return (
    <p className="save-status" role="status">
      {text}
    </p>
  )
}
