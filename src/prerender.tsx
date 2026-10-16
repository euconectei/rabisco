import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AdsProvider } from './ads/AdsProvider'
import { AuthProvider } from './auth/AuthProvider'
import { I18nProvider } from './i18n/I18nProvider'
import type { Language } from './i18n/languages'
import { ModeProvider } from './mode/ModeProvider'
import { LandingPage } from './pages/LandingPage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import SupportPage from './support/SupportPage'

export { BASE_URL, seoFor, secondaryPageSeo, softwareApplicationJsonLd } from './seo'
export { LANGUAGES } from './i18n/languages'

function renderWithProviders(lang: Language, element: ReactElement): string {
  return renderToString(
    <I18nProvider initialLanguage={lang}>
      <AuthProvider config={null}>
        <ModeProvider>
          <AdsProvider>
            <MemoryRouter>{element}</MemoryRouter>
          </AdsProvider>
        </ModeProvider>
      </AuthProvider>
    </I18nProvider>,
  )
}

export function renderLanding(lang: Language): string {
  return renderWithProviders(lang, <LandingPage />)
}

export function renderWhatsNew(lang: Language): string {
  return renderWithProviders(lang, <WhatsNewPage />)
}

export function renderSupport(lang: Language): string {
  return renderWithProviders(lang, <SupportPage />)
}
