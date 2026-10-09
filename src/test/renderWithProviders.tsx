import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthValue } from '../auth/context'
import type { DriveClient } from '../drive/client'
import { DriveContext } from '../drive/context'
import { I18nProvider } from '../i18n/I18nProvider'
import type { Language } from '../i18n/languages'
import { tester } from './fakeAuth'
import { memoryDrive } from './memoryDrive'

export function signedInAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    status: 'signed-in',
    user: tester,
    hint: { email: tester.email, name: tester.name },
    error: null,
    signIn: vi.fn(async () => {}),
    reconnect: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    forgetAccount: vi.fn(),
    prepare: vi.fn(),
    tokens: { getToken: vi.fn(async () => 'test-token'), refreshToken: vi.fn(async () => 'test-token') },
    ...overrides,
  }
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    lang = 'pt-BR',
    auth = signedInAuth(),
    drive = memoryDrive().client,
  }: { route?: string; lang?: Language; auth?: AuthValue; drive?: DriveClient } = {},
) {
  return render(
    <I18nProvider initialLanguage={lang}>
      <AuthContext.Provider value={auth}>
        <DriveContext.Provider value={drive}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </DriveContext.Provider>
      </AuthContext.Provider>
    </I18nProvider>,
  )
}
