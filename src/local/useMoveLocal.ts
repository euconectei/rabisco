import { useCallback, useRef, useState } from 'react'
import { useDrive } from '../drive/useDrive'
import { moveLocalDrawings, type MoveFailure } from './move'

export type MoveState =
  | { phase: 'idle' }
  | { phase: 'running'; done: number; total: number }
  /** `failures` are the drawings still in this browser after the last attempt, with why. */
  | { phase: 'finished'; moved: number; failed: number; failures: MoveFailure[] }

/**
 * Runs "move to Drive" and keeps what the screen needs: progress while it runs and, after a partial
 * failure, which drawings are left so "Try again" only touches those. `moved` adds up across retries.
 */
export function useMoveLocal(): { state: MoveState; start(ids?: readonly string[], total?: number): Promise<void>; reset(): void } {
  const drive = useDrive()
  const [state, setState] = useState<MoveState>({ phase: 'idle' })
  const movedBefore = useRef(0)
  const running = useRef(false)

  const start = useCallback(
    async (requested?: readonly string[], expectedTotal?: number) => {
      if (running.current) return
      running.current = true
      // No ids to retry (the list itself failed): start over with everything.
      const ids = requested?.length ? requested : undefined
      if (!ids) movedBefore.current = 0
      setState({ phase: 'running', done: 0, total: ids?.length ?? expectedTotal ?? 0 })
      try {
        const report = await moveLocalDrawings(drive, {
          ids,
          onProgress: (done, total) => setState({ phase: 'running', done, total }),
        })
        // Another tab is already moving: nothing was done here, so let the person decide again.
        if (report.busy) return setState({ phase: 'idle' })
        movedBefore.current += report.moved
        setState({
          phase: 'finished',
          moved: movedBefore.current,
          failed: report.failed,
          failures: report.failures,
        })
      } catch {
        // The local database could not even be listed: nothing moved, and the retry starts from scratch.
        setState({ phase: 'finished', moved: movedBefore.current, failed: Math.max(ids?.length ?? 0, 1), failures: [] })
      } finally {
        running.current = false
      }
    },
    [drive],
  )

  const reset = useCallback(() => setState({ phase: 'idle' }), [])
  return { state, start, reset }
}
