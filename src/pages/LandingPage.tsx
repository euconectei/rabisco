import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { AdSlot } from '../ads/AdSlot'
import { CookieNotice } from '../ads/CookieNotice'
import { AppFooter } from '../components/AppFooter'
import { Screenshot } from '../components/Screenshot'
import { REPOSITORY_URL } from '../components/links'
import { useI18n } from '../i18n/useI18n'
import { useMode } from '../mode/useMode'
import '../local/local.css'

const FEATURES = ['mindmap', 'draw', 'files'] as const

export function LandingPage() {
  const { t } = useI18n()
  const { localSupport, enterLocal } = useMode()
  const start = (
    <div className="landing-start">
      <Link className="button button-large" to="/app">
        {t.landing.start}
      </Link>
      {localSupport === 'available' && (
        <Link className="landing-try" to="/app" onClick={enterLocal}>
          {t.landing.tryWithoutSignIn}
        </Link>
      )}
    </div>
  )
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="landing-logo">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          {t.app.name}
        </span>
        <LanguageSwitcher />
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-text">
            <h1>{t.landing.title}</h1>
            <p className="landing-lead">{t.app.tagline}</p>
            {start}
          </div>
          <Screenshot shot="canvas" alt={t.landing.heroAlt} className="landing-hero-shot" eager />
        </section>

        <section className="landing-ad">
          <AdSlot placement="landing" />
        </section>

        <section className="landing-section" aria-labelledby="landing-features">
          <h2 id="landing-features">{t.landing.featuresTitle}</h2>
          <div className="landing-features">
            {FEATURES.map((key) => {
              const feature = t.landing.features[key]
              return (
                <article key={key} className="landing-feature">
                  <Screenshot shot={key} alt={feature.alt} />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="landing-section landing-editable" aria-labelledby="landing-editable">
          <div className="landing-editable-text">
            <h2 id="landing-editable">{t.landing.editablePng.title}</h2>
            <p>{t.landing.editablePng.text}</p>
          </div>
          <EditablePngArt label={t.landing.editablePng.alt} />
        </section>

        <section className="landing-section landing-trust" aria-labelledby="landing-trust">
          <h2 id="landing-trust">{t.landing.trustTitle}</h2>
          <ul>
            <li>{t.landing.trust.drive}</li>
            <li>{t.landing.trust.scope}</li>
            <li>
              <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                {t.landing.trust.openSource}
              </a>{' '}
              {t.landing.trust.openSourceText}
            </li>
            <li>{t.landing.trust.offline}</li>
          </ul>
        </section>

        <section className="landing-section landing-cta">
          <h2>{t.landing.ctaTitle}</h2>
          <p>{t.landing.ctaText}</p>
          {start}
        </section>
      </main>

      <AppFooter />
      <CookieNotice />
    </div>
  )
}

/** An exported image on the left turning back into a drawing with editable nodes on the right. */
function EditablePngArt({ label }: { label: string }) {
  return (
    <svg className="landing-editable-art" viewBox="0 0 420 200" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      <g stroke="currentColor" strokeWidth="3">
        <rect x="14" y="30" width="148" height="140" rx="12" fill="Canvas" />
        <path d="M30 150l40-46 28 30 20-22 30 38" strokeOpacity="0.55" />
        <circle cx="52" cy="62" r="9" strokeOpacity="0.55" />
      </g>
      <text x="88" y="22" textAnchor="middle" fontSize="15" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">
        .png
      </text>
      <g stroke="var(--accent)" strokeWidth="3.5">
        <path d="M176 100h66" />
        <path d="M228 86l16 14-16 14" />
      </g>
      <g stroke="currentColor" strokeWidth="3">
        <path d="M330 100C312 82 300 70 292 58" />
        <path d="M330 100C350 86 362 78 372 66" />
        <path d="M330 100C346 120 358 132 368 146" />
        <rect x="298" y="82" width="64" height="36" rx="10" fill="Canvas" />
      </g>
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.5" fill="Canvas">
        <rect x="256" y="30" width="56" height="30" rx="8" />
        <rect x="350" y="42" width="56" height="30" rx="8" />
        <rect x="346" y="132" width="56" height="30" rx="8" />
      </g>
      <g fill="Canvas" stroke="var(--accent)" strokeWidth="2">
        <rect x="294" y="78" width="8" height="8" />
        <rect x="358" y="78" width="8" height="8" />
        <rect x="294" y="114" width="8" height="8" />
        <rect x="358" y="114" width="8" height="8" />
      </g>
    </svg>
  )
}
