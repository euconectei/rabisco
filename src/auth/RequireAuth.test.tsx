import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import userEvent from '@testing-library/user-event'
import { RequireAuth } from './RequireAuth'
import { AuthContext, type AuthValue } from './context'
import { renderWithProviders } from '../test/renderWithProviders'
import { ModeContext, type AppMode, type LocalSupport, type ModeValue } from '../mode/context'

function value(overrides: Partial<AuthValue>): AuthValue {
  return {
    status: 'signed-out',
    user: null,
    hint: null,
    error: null,
    signIn: vi.fn(async () => {}),
    reconnect: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    forgetAccount: vi.fn(),
    prepare: vi.fn(),
    tokens: { getToken: vi.fn(), refreshToken: vi.fn() },
    ...overrides,
  }
}

function modeValue(mode: AppMode = 'google', localSupport: LocalSupport = 'available'): ModeValue {
  return { mode, localSupport, enterLocal: vi.fn(), leaveLocal: vi.fn() }
}

function setup(auth: AuthValue, lang: 'pt-BR' | 'en' = 'pt-BR', mode: ModeValue = modeValue(), route = '/') {
  renderWithProviders(
    <AuthContext.Provider value={auth}>
      <ModeContext.Provider value={mode}>
        <RequireAuth>
          <p>private stuff</p>
        </RequireAuth>
      </ModeContext.Provider>
    </AuthContext.Provider>,
    { lang, route },
  )
}

it('says sign-in is unavailable without config', () => {
  setup(value({ status: 'unavailable' }))
  expect(screen.getByText('Login indisponível neste ambiente.')).toBeInTheDocument()
  expect(screen.queryByText('private stuff')).not.toBeInTheDocument()
})

it('offers Google sign-in and prepares the Google script', async () => {
  const auth = value({})
  setup(auth)
  expect(auth.prepare).toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }))
  expect(auth.signIn).toHaveBeenCalled()
})

it('offers to continue as the remembered account, or use another one', async () => {
  const auth = value({ hint: { email: 'ana@example.com', name: 'Ana Souza' } })
  setup(auth, 'en')
  await userEvent.click(screen.getByRole('button', { name: 'Continue as Ana Souza' }))
  expect(auth.signIn).toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Use another account' }))
  expect(auth.forgetAccount).toHaveBeenCalled()
})

it('shows progress and errors', () => {
  setup(value({ status: 'signing-in' }))
  expect(screen.getByText('Entrando…')).toBeInTheDocument()
})

it('shows the failure message after a refused sign-in', () => {
  setup(value({ error: 'failed' }))
  expect(screen.getByText('Não foi possível entrar. Tente de novo.')).toBeInTheDocument()
})

it('explains that Drive access is required when it was not granted', () => {
  setup(value({ error: 'missingDrive' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Falta só uma permissão' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('O acesso ao Google Drive não foi concedido')
  expect(screen.getByRole('alert')).toHaveTextContent('o Rabisco precisa de acesso ao seu Google Drive')
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
})

it('retries the sign-in from the missing Drive permission screen', async () => {
  const auth = value({ error: 'missingDrive' })
  setup(auth)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(auth.signIn).toHaveBeenCalled()
})

it('shows the remembered account as a row, with a short button that still names the account', () => {
  setup(value({ hint: { email: 'ana@example.com', name: 'Ana Souza' } }))
  expect(screen.getByRole('heading', { level: 1, name: 'Que bom ver você de novo' })).toBeInTheDocument()
  expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Continuar como Ana Souza' })
  expect(button).toHaveTextContent(/^Continuar$/)
})

it('first visit: gives the reasons to trust and links the terms and the policy', () => {
  setup(value({}))
  expect(screen.getByRole('heading', { level: 1, name: 'Entre para começar' })).toBeInTheDocument()
  expect(screen.getByText(/Seus desenhos ficam no seu Google Drive, não em um servidor nosso/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/terms')
  expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy')
})

it('renders the private content when signed in', () => {
  setup(value({ status: 'signed-in' }))
  expect(screen.getByText('private stuff')).toBeInTheDocument()
})

it('keeps the content and shows a reconnect banner when the session expired', async () => {
  const auth = value({ status: 'needs-reconnect' })
  setup(auth)
  expect(screen.getByText('private stuff')).toBeInTheDocument()
  expect(screen.getByText(/Sua sessão com o Google expirou/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Reconectar' }))
  expect(auth.reconnect).toHaveBeenCalled()
})

it('does not remount the page when the reconnect banner appears and goes away', () => {
  let mounts = 0
  function Page() {
    useEffect(() => {
      mounts += 1
    }, [])
    return <p>page</p>
  }
  const tree = (auth: AuthValue) => (
    <I18nProvider initialLanguage="pt-BR">
      <AuthContext.Provider value={auth}>
        <ModeContext.Provider value={modeValue()}>
          <MemoryRouter>
            <RequireAuth>
              <Page />
            </RequireAuth>
          </MemoryRouter>
        </ModeContext.Provider>
      </AuthContext.Provider>
    </I18nProvider>
  )
  const { rerender } = render(tree(value({ status: 'signed-in' })))
  rerender(tree(value({ status: 'needs-reconnect' })))
  rerender(tree(value({ status: 'signed-in' })))
  expect(mounts).toBe(1)
})

describe('using it without signing in', () => {
  it('offers "Use without signing in" next to Google sign-in, with a one-line explanation', async () => {
    const mode = modeValue()
    setup(value({}), 'pt-BR', mode)
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
    expect(screen.getByText('Sem conta: os desenhos ficam só neste navegador.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Usar sem entrar' }))
    expect(mode.enterLocal).toHaveBeenCalledTimes(1)
  })

  it('also offers it to someone with a remembered account, in English', async () => {
    const mode = modeValue()
    setup(value({ hint: { email: 'ana@example.com', name: 'Ana Souza' } }), 'en', mode)
    await userEvent.click(screen.getByRole('button', { name: 'Use without signing in' }))
    expect(mode.enterLocal).toHaveBeenCalledTimes(1)
  })

  it('offers it even when Google sign-in is not configured', () => {
    setup(value({ status: 'unavailable' }))
    expect(screen.getByRole('button', { name: 'Usar sem entrar' })).toBeEnabled()
  })

  it('shows the private content, with no sign-in screen and no Google script, in local mode', () => {
    const auth = value({})
    setup(auth, 'pt-BR', modeValue('local'))
    expect(screen.getByText('private stuff')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).not.toBeInTheDocument()
    expect(auth.prepare).not.toHaveBeenCalled()
  })

  it('explains that it is not available, and keeps Google sign-in, when the browser cannot keep drawings', () => {
    setup(value({}), 'pt-BR', modeValue('google', 'unavailable'))
    expect(screen.queryByRole('button', { name: 'Usar sem entrar' })).not.toBeInTheDocument()
    expect(screen.getByText(/O modo sem entrar não está disponível neste navegador/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
  })

  it('disables the button while the browser storage is still being checked', () => {
    setup(value({}), 'pt-BR', modeValue('google', 'checking'))
    expect(screen.getByRole('button', { name: 'Usar sem entrar' })).toBeDisabled()
  })

  it('does not offer it on the missing-permission screen', () => {
    setup(value({ error: 'missingDrive' }))
    expect(screen.queryByRole('button', { name: 'Usar sem entrar' })).not.toBeInTheDocument()
  })
})

describe('a saved local mode and links into the Drive', () => {
  it.each(['/open?state=%7B%22ids%22%3A%5B%22abc%22%5D%7D', '/edit/1AbCdEfGh'])('leaves the local mode on %s, to sign in on the same page', (route) => {
    const mode = modeValue('local')
    setup(value({}), 'pt-BR', mode, route)
    expect(mode.leaveLocal).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('private stuff')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar sem entrar' })).not.toBeInTheDocument()
  })

  it.each(['/app', '/edit/local-1234', '/edit/new'])('keeps %s free in the local mode', (route) => {
    const mode = modeValue('local')
    setup(value({}), 'pt-BR', mode, route)
    expect(mode.leaveLocal).not.toHaveBeenCalled()
    expect(screen.getByText('private stuff')).toBeInTheDocument()
  })

  it('does not touch the Google mode', () => {
    const mode = modeValue('google')
    setup(value({}), 'pt-BR', mode, '/edit/1AbCdEfGh')
    expect(mode.leaveLocal).not.toHaveBeenCalled()
  })
})
