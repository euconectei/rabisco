import { useAuth } from '../auth/useAuth'
import { useI18n } from '../i18n/useI18n'

/**
 * "Sign in" for someone using Rabisco without an account. Google's script is only fetched when the
 * person shows intent (pointer or keyboard focus on the button), so plain local use loads nothing
 * from Google, yet the click can still open Google's window right away.
 */
export function LocalSignIn({ className = 'button-secondary' }: { className?: string }) {
  const { t } = useI18n()
  const auth = useAuth()
  const busy = auth.status === 'signing-in'
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onPointerEnter={auth.prepare}
        onFocus={auth.prepare}
        onClick={() => void auth.signIn()}
      >
        {busy ? t.auth.signingIn : t.local.signIn}
      </button>
      {auth.error && (
        <span role="alert" className="local-sign-in-error">
          {auth.error === 'missingDrive' ? t.auth.missingDrive : t.auth.failed}
        </span>
      )}
    </>
  )
}
