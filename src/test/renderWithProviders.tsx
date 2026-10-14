import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AdsProvider } from '../ads/AdsProvider'
import type { AdsenseConfig } from '../ads/config'
import { AuthContext, type AuthValue } from '../auth/context'
import type { DriveClient } from '../drive/client'
import { DriveContext } from '../drive/context'
import { I18nProvider } from '../i18n/I18nProvider'
import type { Language } from '../i18n/languages'
import { LocalDriveContext } from '../local/context'
import { ModeContext, type AppMode, type ModeValue } from '../mode/context'
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
    mode = 'google',
    modeValue = {},
    localDrive = memoryDrive().client,
    ads = {},
  }: {
    route?: string
    lang?: Language
    auth?: AuthValue
    drive?: DriveClient
    /** The mode the app is in. In the local mode the drive in use is `localDrive`, as in the real app. */
    mode?: AppMode
    /** Overrides for the rest of the mode value (e.g. spies for `enterLocal`). */
    modeValue?: Partial<ModeValue>
    /** The client for drawings kept in this browser (what `useLocalDrive` returns). */
    localDrive?: DriveClient
    // Defaults to Europe with no AdSense: the house ad, no cookie notice, whatever the machine's time zone.
    ads?: { timeZone?: string; adsense?: AdsenseConfig | null; exemptHashes?: readonly string[] }
  } = {},
) {
  const modeContext: ModeValue = { mode, localSupport: 'available', enterLocal: vi.fn(), leaveLocal: vi.fn(), ...modeValue }
  return render(
    <I18nProvider initialLanguage={lang}>
      <AuthContext.Provider value={auth}>
        <ModeContext.Provider value={modeContext}>
          <AdsProvider timeZone={ads.timeZone ?? 'Europe/Lisbon'} adsense={ads.adsense ?? null} exemptHashes={ads.exemptHashes}>
            <LocalDriveContext.Provider value={localDrive}>
              <DriveContext.Provider value={mode === 'local' ? localDrive : drive}>
                <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
              </DriveContext.Provider>
            </LocalDriveContext.Provider>
          </AdsProvider>
        </ModeContext.Provider>
      </AuthContext.Provider>
    </I18nProvider>,
  )
}
