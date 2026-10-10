import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { AppFooter } from '../components/AppFooter'
import { Screenshot } from '../components/Screenshot'
import { REPOSITORY_URL } from '../components/links'
import { useI18n } from '../i18n/useI18n'

const FEATURES = ['mindmap', 'draw', 'files'] as const

export function LandingPage() {
  const { t } = useI18n()
  const start = (
    <Link className="button button-large" to="/app">
      {t.landing.start}
    </Link>
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
    </div>
  )
}
