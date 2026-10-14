import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import type { MoveState } from './useMoveLocal'

/** Progress, then what was moved and, for each drawing that stayed here, its name and why. */
export function MoveResult({ state, onRetry, onClose }: { state: Exclude<MoveState, { phase: 'idle' }>; onRetry(ids: string[]): void; onClose(): void }) {
  const { t } = useI18n()
  if (state.phase === 'running') {
    return (
      <p role="status" className="move-progress">
        {format(t.move.progress, { done: String(state.done), total: String(state.total) })}
      </p>
    )
  }
  const failed = state.failed > 0
  let summary: string
  if (failed && state.moved > 0) summary = format(t.move.partial, { moved: String(state.moved), failed: String(state.failed) })
  else if (failed) summary = t.move.noneMoved
  else if (state.moved === 1) summary = t.move.doneOne
  else if (state.moved === 0) summary = t.move.noneMoved
  else summary = format(t.move.done, { count: String(state.moved) })
  const retryIds = state.failures.map((failure) => failure.id)
  return (
    <>
      <p role={failed ? 'alert' : 'status'}>{summary}</p>
      {state.failures.length > 0 && (
        <>
          <p className="move-failed-heading">{t.move.failedHeading}</p>
          <ul className="move-failures">
            {state.failures.map((failure) => (
              <li key={failure.id}>
                <strong>{failure.name.replace(/\.excalidraw$/i, '')}</strong>: {t.move.reasons[failure.reason]}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="move-offer-actions">
        {failed && (
          <button type="button" className="button" onClick={() => onRetry(retryIds)}>
            {t.move.retry}
          </button>
        )}
        <button type="button" className="button-secondary" onClick={onClose}>
          {t.move.close}
        </button>
      </div>
    </>
  )
}
