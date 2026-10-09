import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { googleConfig } from './config'
import { I18nProvider } from './i18n/I18nProvider'
import { AppRoutes } from './routes'

export function App() {
  return (
    <I18nProvider>
      <AuthProvider config={googleConfig()}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
