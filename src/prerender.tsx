import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AdsProvider } from './ads/AdsProvider'
import { AuthProvider } from './auth/AuthProvider'
import { I18nProvider } from './i18n/I18nProvider'
import type { Language } from './i18n/languages'
import { ModeProvider } from './mode/ModeProvider'
import { LandingPage } from './pages/LandingPage'

export { BASE_URL, seoFor, softwareApplicationJsonLd } from './seo'
export { LANGUAGES } from './i18n/languages'

export function renderLanding(lang: Language): string {
  return renderToString(
    <I18nProvider initialLanguage={lang}>
      <AuthProvider config={null}>
        <ModeProvider>
          <AdsProvider>
            <MemoryRouter>
              <LandingPage />
            </MemoryRouter>
          </AdsProvider>
        </ModeProvider>
      </AuthProvider>
    </I18nProvider>,
  )
}
