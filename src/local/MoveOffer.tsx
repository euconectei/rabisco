import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import { useMode } from '../mode/useMode'
import { markMoveOfferAnswered, moveOfferAnswered } from './move'
import { MoveResult } from './MoveResult'
import { useLocalDrawings } from './useLocalDrawings'
import { useMoveLocal } from './useMoveLocal'
import './local.css'

/**
 * Right after signing in with drawings still in this browser: offers once per browser session to move
 * them to the Drive. Declining keeps them where they are (the "Local drawings" link stays); nothing is
 * deleted before its copy in Drive was checked.
 */
export function MoveOffer() {
  const { t } = useI18n()
  const { mode } = useMode()
  const auth = useAuth()
  const { drawings, reload } = useLocalDrawings()
  const { state, start, reset } = useMoveLocal()
  const [dismissed, setDismissed] = useState(() => moveOfferAnswered())

  if (mode !== 'google' || auth.status !== 'signed-in' || dismissed) return null
  const count = drawings.kind === 'ready' ? drawings.files.length : 0
  if (state.phase === 'idle' && count === 0) return null

  function answer() {
    markMoveOfferAnswered()
    setDismissed(true)
  }

  async function confirm() {
    markMoveOfferAnswered()
    await start(undefined, count)
    await reload()
  }

  async function retry(ids: string[]) {
    await start(ids)
    await reload()
  }

  return (
    <section className="move-offer" aria-labelledby="move-offer-title">
      <h2 id="move-offer-title">{t.move.offerTitle}</h2>
      {state.phase === 'idle' && (
        <>
          <p>{count === 1 ? t.move.offerOne : format(t.move.offer, { count: String(count) })}</p>
          <p className="move-offer-body">{t.move.offerBody}</p>
          <div className="move-offer-actions">
            <button type="button" className="button" onClick={() => void confirm()}>
              {t.move.confirm}
            </button>
            <button type="button" className="button-secondary" onClick={answer}>
              {t.move.later}
            </button>
          </div>
        </>
      )}
      {state.phase !== 'idle' && <MoveResult state={state} onRetry={(ids) => void retry(ids)} onClose={() => { reset(); answer() }} />}
    </section>
  )
}
