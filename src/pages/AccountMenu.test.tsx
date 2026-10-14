import 'fake-indexeddb/auto'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getDraft, putDraft } from '../editor/drafts'
import { ModeContext, type AppMode, type ModeValue } from '../mode/context'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { AccountMenu } from './AccountMenu'

function modeValue(mode: AppMode): ModeValue {
  return { mode, localSupport: 'available', enterLocal: vi.fn(), leaveLocal: vi.fn() }
}

function setup(mode: AppMode, auth = signedInAuth()) {
  renderWithProviders(
    <ModeContext.Provider value={modeValue(mode)}>
      <AccountMenu />
    </ModeContext.Provider>,
    { auth },
  )
  return auth
}

const signedOut = (overrides = {}) => signedInAuth({ status: 'signed-out', user: null, hint: null, ...overrides })

it('offers "Sign in" without an account when drawings are kept in this browser', async () => {
  const auth = setup('local', signedOut())
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(auth.signIn).toHaveBeenCalled()
})

it('loads the Google script only when the person shows intent to sign in', async () => {
  const auth = setup('local', signedOut())
  expect(auth.prepare).not.toHaveBeenCalled()
  await userEvent.hover(screen.getByRole('button', { name: 'Entrar' }))
  expect(auth.prepare).toHaveBeenCalled()
})

it('shows progress and disables the button while signing in, and an alert after a failure', () => {
  setup('local', signedOut({ status: 'signing-in', error: 'failed' }))
  expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível entrar')
})

it('renders nothing when signed out in Google mode', () => {
  setup('google', signedOut())
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('signs out forgetting the Drive drafts, but keeps the drafts of drawings kept in this browser', async () => {
  await putDraft({ fileId: 'drive-file', json: '{}', baseVersion: 'r', updatedAt: 1 })
  await putDraft({ fileId: 'local-abc', json: '{}', baseVersion: 'r', updatedAt: 1 })
  const auth = setup('google')
  await userEvent.click(screen.getByRole('button', { name: 'Conta: Ana Souza' }))
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await waitFor(() => expect(auth.signOut).toHaveBeenCalled())
  await expect(getDraft('drive-file')).resolves.toBeNull()
  await expect(getDraft('local-abc')).resolves.not.toBeNull()
})
