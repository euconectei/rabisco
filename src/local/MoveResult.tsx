import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import type { MoveState } from './useMoveLocal'

/** Progress, then "N moved" or "N moved, M failed" with a retry for the ones that failed. */
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
  return (
    <>
      <p role={failed ? 'alert' : 'status'}>
        {failed
          ? format(t.move.partial, { moved: String(state.moved), failed: String(state.failed) })
          : state.moved === 1
            ? t.move.doneOne
            : format(t.move.done, { count: String(state.moved) })}
      </p>
      <div className="move-offer-actions">
        {failed && (
          <button type="button" className="button" onClick={() => onRetry(state.failedIds)}>
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
