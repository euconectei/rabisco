import { useEffect, type ReactNode } from 'react'
import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const auth = useAuth()
  const { status, hint, error, prepare } = auth

  useEffect(() => {
    if (status === 'signed-out') prepare()
  }, [status, prepare])

  if (status === 'signed-in' || status === 'needs-reconnect') {
    // Same element structure in both states: toggling the banner must never remount the page
    // below it (the editor would lose its unsaved state).
    return (
      <>
        {status === 'needs-reconnect' ? (
          <div className="reconnect-banner" role="status">
            <span>{t.auth.reconnectBanner}</span>
            <button type="button" className="button" onClick={() => void auth.reconnect()}>
              {t.auth.reconnect}
            </button>
          </div>
        ) : null}
        {children}
      </>
    )
  }

  return (
    <main className="page sign-in">
      <h1>{t.app.name}</h1>
      {status === 'unavailable' && <p>{t.auth.unavailable}</p>}
      {status === 'signing-in' && <p>{t.auth.signingIn}</p>}
      {status === 'signed-out' && (
        <>
          {error && <p role="alert">{error === 'missingDrive' ? t.auth.missingDrive : t.auth.failed}</p>}
          {hint ? (
            <>
              <button type="button" className="button" onClick={() => void auth.signIn()}>
                {format(t.auth.continueAs, { name: hint.name })}
              </button>
              <button type="button" className="button-link" onClick={auth.forgetAccount}>
                {t.auth.otherAccount}
              </button>
            </>
          ) : (
            <button type="button" className="button" onClick={() => void auth.signIn()}>
              {t.auth.signIn}
            </button>
          )}
        </>
      )}
    </main>
  )
}
