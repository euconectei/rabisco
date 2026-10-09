import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { googleConfig } from './config'
import { DriveProvider } from './drive/DriveProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { AppRoutes } from './routes'

export function App() {
  return (
    <I18nProvider>
      <AuthProvider config={googleConfig()}>
        <DriveProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DriveProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
