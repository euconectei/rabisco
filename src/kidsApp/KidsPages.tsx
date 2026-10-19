import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { LegalPage } from '../legal/LegalPage'
import { KidsContact } from './contact'
import { KidsPrivacyEn, KidsPrivacyPtBR } from './privacy'

// Rabisco Kids is the Android app, not the /kids web page. These pages carry no ads and no
// third-party script, and they live outside /kids/ so the notebook's service worker never answers them.

export const KIDS_HOME = '/rabisco-kids'
export const KIDS_PRIVACY = '/rabisco-kids/privacy'
// Bump this whenever privacy.tsx changes in a way people should know about.
export const KIDS_PRIVACY_UPDATED = '2026-10-19'

function KidsFooter() {
  const { t } = useI18n()
  return (
    <footer className="app-footer">
      <Link to={KIDS_HOME}>{t.kidsApp.title}</Link>
      <span aria-hidden="true">·</span>
      <Link to={KIDS_PRIVACY}>{t.kidsApp.privacyLink}</Link>
      <span aria-hidden="true">·</span>
      <KidsContact />
    </footer>
  )
}

export function KidsAppPage() {
  const { t } = useI18n()
  const k = t.kidsApp
  return (
    <LegalPage title={k.title} updated={KIDS_PRIVACY_UPDATED} home={KIDS_HOME} footer={<KidsFooter />}>
      <p>{k.intro}</p>
      <h2>{k.whatTitle}</h2>
      <ul>
        {k.what.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{k.priceTitle}</h2>
      <p>{k.price}</p>
      <h2>{k.privacyTitleShort}</h2>
      <p>
        {k.privacySummary} <Link to={KIDS_PRIVACY}>{k.privacyLink}</Link>
      </p>
      <h2>{k.whereTitle}</h2>
      <p>{k.where}</p>
      <h2>{k.contactTitle}</h2>
      <p>
        {k.contact} <KidsContact />
      </p>
    </LegalPage>
  )
}

export function KidsPrivacyPage() {
  const { lang, t } = useI18n()
  return (
    <LegalPage title={t.kidsApp.privacyTitle} updated={KIDS_PRIVACY_UPDATED} home={KIDS_HOME} footer={<KidsFooter />}>
      {lang === 'pt-BR' ? <KidsPrivacyPtBR /> : <KidsPrivacyEn />}
    </LegalPage>
  )
}
