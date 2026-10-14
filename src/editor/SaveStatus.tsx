import type { ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'
import type { SaveStatus as Status } from './saveQueue'

interface Props {
  status: Status
  lost: boolean
  /** The drawing lives only in this browser: the words must not mention the Drive. */
  local?: boolean
  onRetry(): void
  onSaveAsNew(): void
}

type Tone = 'ok' | 'busy' | 'local' | 'warn' | 'error'

const CLOUD = 'M6.5 19a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.4 9 4.5 4.5 0 0 1 17.5 19z'

/** A cloud (the Drive) with a mark inside: saved, saving, only on this device, or a problem. */
function Icon({ mark }: { mark: 'check' | 'upload' | 'off' | 'alert' }): ReactNode {
  return (
    <svg className="save-status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CLOUD} />
      {mark === 'check' && <path d="M9 14.5l2.5 2.5 4.5-5" />}
      {mark === 'upload' && <path className="save-status-arrow" d="M12 17v-5M9.8 14.2L12 12l2.2 2.2" />}
      {mark === 'off' && <path d="M4 4l16 16" />}
      {mark === 'alert' && <path d="M12 12v2.8M12 17.2v.01" />}
    </svg>
  )
}

export function SaveStatus({ status, lost, local = false, onRetry, onSaveAsNew }: Props) {
  const { t } = useI18n()
  // Conflict, needs-auth and offline cannot happen in this browser's own storage; they keep the normal words.
  const words = local ? { ...t.editor.status, ...t.editor.statusLocal } : t.editor.status

  // Quiet states: the icon says it, the text is its tooltip and what screen readers announce.
  const quiet = (tone: Tone, mark: 'check' | 'upload' | 'off', text: string) => (
    <p className={`save-status save-status-${tone}`} role="status" title={text}>
      <Icon mark={mark} />
      <span className="visually-hidden">{text}</span>
    </p>
  )

  // States that need a decision keep the words (and the button).
  const loud = (tone: Tone, mark: 'off' | 'alert', text: string, action?: { label: string; run(): void }) => (
    <p className={`save-status save-status-${tone}`} role="status">
      <Icon mark={mark} />
      <span>
        {text}
        {action && (
          <>
            {' '}
            <button type="button" className="button-link" onClick={action.run}>
              {action.label}
            </button>
          </>
        )}
      </span>
    </p>
  )

  if (status === 'error' && lost) return loud('error', 'alert', words.lost, { label: t.editor.saveAsNew, run: onSaveAsNew })
  if (status === 'error') return loud('error', 'alert', words.error, { label: t.editor.retry, run: onRetry })
  if (status === 'conflict') return loud('warn', 'alert', words.conflict)
  if (status === 'needs-auth') return loud('warn', 'off', words.needsAuth)
  if (status === 'saved') return quiet('ok', 'check', words.saved)
  if (status === 'saving') return quiet('busy', 'upload', words.saving)
  // The change is safe on this device and waits for the Drive; offline also offers a manual retry.
  if (status === 'offline') return loud('local', 'off', words.offline, { label: t.editor.retry, run: onRetry })
  return quiet('local', 'off', words.pending)
}
