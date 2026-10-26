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
import ImportDocsPage from './docs/ImportDocsPage'
import { KidsAppPage, KidsPrivacyPage } from './kidsApp/KidsPages'

export { BASE_URL, PT_BR_PAGE_PATHS, seoFor, secondaryPageSeo, softwareApplicationJsonLd } from './seo'
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

export function renderKidsApp(lang: Language): string {
  return renderWithProviders(lang, <KidsAppPage />)
}

export function renderKidsPrivacy(lang: Language): string {
  return renderWithProviders(lang, <KidsPrivacyPage />)
}

export function renderImportDocs(lang: Language): string {
  return renderWithProviders(lang, <ImportDocsPage />)
}
