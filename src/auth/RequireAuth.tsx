import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import { useMode } from '../mode/useMode'
import '../local/local.css'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const auth = useAuth()
  const { mode, localSupport, enterLocal } = useMode()
  const { status, hint, error, prepare } = auth
  const local = mode === 'local'

  useEffect(() => {
    // Using it without an account must not load anything from Google until the person asks to sign in.
    if (status === 'signed-out' && !local) prepare()
  }, [status, prepare, local])

  // Drawings kept in this browser need no sign-in.
  if (local) return <>{children}</>

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

  const missingDrive = status === 'signed-out' && error === 'missingDrive'
  const useWithoutSigningIn = (
    <div className="sign-in-local">
      {localSupport === 'unavailable' ? (
        <p className="sign-in-note" role="note">
          {t.auth.localUnavailable}
        </p>
      ) : (
        <>
          <button type="button" className="button-secondary button-large" disabled={localSupport !== 'available'} onClick={enterLocal}>
            {t.auth.useWithoutSignIn}
          </button>
          <p className="sign-in-note">{t.auth.useWithoutSignInHint}</p>
        </>
      )}
    </div>
  )
  return (
    <main className="sign-in">
      <aside className="sign-in-panel">
        <span className="sign-in-brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          {t.app.name}
        </span>
        <div className="sign-in-pitch">
          <MindMapArt />
          <p className="sign-in-tagline">{t.landing.title}</p>
          {missingDrive && <p className="sign-in-why">{t.auth.missingDriveWhy}</p>}
        </div>
        <p className="sign-in-sub">{t.app.tagline}</p>
      </aside>
      <section className="sign-in-card">
        <div className="sign-in-form">
          {status === 'unavailable' && (
            <>
              <p>{t.auth.unavailable}</p>
              {useWithoutSigningIn}
            </>
          )}
          {status === 'signing-in' && <p>{t.auth.signingIn}</p>}
          {status === 'signed-out' && missingDrive && (
            <>
              <h1>{t.auth.missingDriveTitle}</h1>
              <div className="sign-in-warning" role="alert">
                <strong>{t.auth.missingDriveHeading}</strong>
                <span>{t.auth.missingDrive}</span>
              </div>
              <button type="button" className="button button-large" onClick={() => void auth.signIn()}>
                {t.auth.tryAgain}
              </button>
              {hint && (
                <button type="button" className="button-link sign-in-link" onClick={auth.forgetAccount}>
                  {t.auth.otherAccount}
                </button>
              )}
              <p className="sign-in-note">{t.auth.reassurance}</p>
            </>
          )}
          {status === 'signed-out' && !missingDrive && (
            <>
              <h1>{hint ? t.auth.welcomeBack : t.auth.signInTitle}</h1>
              {error && <p role="alert">{t.auth.failed}</p>}
              {hint ? (
                <>
                  <div className="sign-in-account">
                    <span className="sign-in-avatar" aria-hidden="true">
                      {hint.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="sign-in-who">
                      <strong>{hint.name}</strong>
                      <span>{hint.email}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button button-large"
                    aria-label={format(t.auth.continueAs, { name: hint.name })}
                    onClick={() => void auth.signIn()}
                  >
                    {t.auth.continue}
                  </button>
                  <button type="button" className="button-link sign-in-link" onClick={auth.forgetAccount}>
                    {t.auth.otherAccount}
                  </button>
                  <p className="sign-in-note">{t.auth.reassurance}</p>
                  {useWithoutSigningIn}
                </>
              ) : (
                <>
                  <button type="button" className="button button-large" onClick={() => void auth.signIn()}>
                    {t.auth.signIn}
                  </button>
                  <ul className="sign-in-reasons">
                    <li>{t.auth.reasons.drive}</li>
                    <li>{t.auth.reasons.scope}</li>
                    <li>{t.auth.reasons.free}</li>
                  </ul>
                  <p className="sign-in-note">
                    {t.auth.agreeStart}
                    <Link to="/terms">{t.footer.terms}</Link>
                    {t.auth.agreeMiddle}
                    <Link to="/privacy">{t.legal.privacyTitle}</Link>.
                  </p>
                  {useWithoutSigningIn}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

/** A hand-drawn mind map, decorative. */
function MindMapArt() {
  return (
    <svg className="sign-in-art" viewBox="0 0 360 230" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.5">
        <path d="M180 118C140 96 108 76 88 52" />
        <path d="M180 118C226 100 258 88 284 62" />
        <path d="M180 118C220 148 252 168 280 190" />
        <path d="M180 118C150 146 124 164 98 178" />
        <rect x="138" y="94" width="84" height="48" rx="12" fill="Canvas" />
      </g>
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" fill="Canvas">
        <rect x="36" y="22" width="70" height="36" rx="10" />
        <rect x="262" y="34" width="70" height="36" rx="10" />
        <rect x="256" y="172" width="70" height="36" rx="10" />
        <rect x="34" y="162" width="70" height="36" rx="10" />
      </g>
    </svg>
  )
}
