import { screen } from '@testing-library/react'
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
