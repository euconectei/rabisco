import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useMode } from '../mode/useMode'
import { MOVE_OFFER_KEY, resetMoveOffer } from './move'

/**
 * Signing in while using the app without an account ends the local mode: the drawings stay in this
 * browser, the files page shows the Drive again and offers to move them. Render it once inside the Router.
 */
export function LocalModeGate({ children }: { children?: ReactNode }) {
  const { mode, leaveLocal } = useMode()
  const { status } = useAuth()
  const navigate = useNavigate()
  const signedInFromLocal = mode === 'local' && status === 'signed-in'
  // Once per sign-in, even if the router hands out a new `navigate` while the mode is still changing.
  const handled = useRef(false)

  useEffect(() => {
    if (!signedInFromLocal) {
      handled.current = false
      return
    }
    if (handled.current) return
    handled.current = true
    // A new offer for the drawings made since the last answer, if any.
    resetMoveOffer()
    try {
      sessionStorage.removeItem(MOVE_OFFER_KEY)
    } catch {
      // Without sessionStorage the in-memory answer was reset above.
    }
    leaveLocal()
    navigate('/app', { replace: true })
  }, [signedInFromLocal, leaveLocal, navigate])

  return <>{children}</>
}
