import { BrowserRouter } from 'react-router-dom'
import { AdsProvider } from './ads/AdsProvider'
import { AuthProvider } from './auth/AuthProvider'
import { googleConfig } from './config'
import { DriveProvider } from './drive/DriveProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { LanguageSuggestion } from './i18n/LanguageSuggestion'
import { ModeProvider } from './mode/ModeProvider'
import { AppRoutes } from './routes'

export function App() {
  return (
    <I18nProvider>
      <LanguageSuggestion />
      <AuthProvider config={googleConfig()}>
        <ModeProvider>
          <AdsProvider>
            <DriveProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </DriveProvider>
          </AdsProvider>
        </ModeProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
