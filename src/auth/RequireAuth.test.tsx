import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import userEvent from '@testing-library/user-event'
import { RequireAuth } from './RequireAuth'
import { AuthContext, type AuthValue } from './context'
import { renderWithProviders } from '../test/renderWithProviders'

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

function setup(auth: AuthValue, lang: 'pt-BR' | 'en' = 'pt-BR') {
  renderWithProviders(
    <AuthContext.Provider value={auth}>
      <RequireAuth>
        <p>private stuff</p>
      </RequireAuth>
    </AuthContext.Provider>,
    { lang },
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
        <MemoryRouter>
          <RequireAuth>
            <Page />
          </RequireAuth>
        </MemoryRouter>
      </AuthContext.Provider>
    </I18nProvider>
  )
  const { rerender } = render(tree(value({ status: 'signed-in' })))
  rerender(tree(value({ status: 'needs-reconnect' })))
  rerender(tree(value({ status: 'signed-in' })))
  expect(mounts).toBe(1)
})
