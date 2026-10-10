import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { ALL_SCOPES, fakeIdentity, tester } from '../test/fakeAuth'
import type { GoogleConfig } from '../config'

const config: GoogleConfig = { clientId: 'cid', apiKey: 'key', appId: '1' }

let latest: ReturnType<typeof useAuth>
function Probe() {
  const auth = useAuth()
  useEffect(() => {
    latest = auth
  })
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.email ?? '-'}</p>
      <button type="button" onClick={() => void auth.signIn()}>sign in</button>
      <button type="button" onClick={() => void auth.signOut()}>sign out</button>
    </div>
  )
}

function setup(identity = fakeIdentity().identity, cfg: GoogleConfig | null = config) {
  const fetchUserInfo = vi.fn(async () => tester)
  render(
    <AuthProvider config={cfg} identity={identity} fetchUserInfo={fetchUserInfo}>
      <Probe />
    </AuthProvider>,
  )
  return { identity, fetchUserInfo }
}

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

it('is unavailable without Google config', () => {
  setup(undefined, null)
  expect(screen.getByTestId('status')).toHaveTextContent('unavailable')
})

it('asks for consent on the first sign-in, then loads the user and remembers the account', async () => {
  const { identity, fetchUserInfo } = setup()
  expect(screen.getByTestId('status')).toHaveTextContent('signed-out')
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  expect(identity.requestToken).toHaveBeenCalledWith({ prompt: 'consent', loginHint: undefined })
  expect(fetchUserInfo).toHaveBeenCalledWith('token-default')
  expect(screen.getByTestId('status')).toHaveTextContent('signed-in')
  expect(screen.getByTestId('user')).toHaveTextContent('ana@example.com')
  const stored = localStorage.getItem('rabisco.account')!
  expect(JSON.parse(stored)).toEqual({ email: 'ana@example.com', name: 'Ana Souza' })
  expect(stored).not.toContain('token')
})

it('skips the consent screen when the account is remembered', async () => {
  localStorage.setItem('rabisco.account', JSON.stringify({ email: 'ana@example.com', name: 'Ana Souza' }))
  const { identity } = setup()
  expect(latest.hint).toEqual({ email: 'ana@example.com', name: 'Ana Souza' })
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  expect(identity.requestToken).toHaveBeenCalledWith({ prompt: '', loginHint: 'ana@example.com' })
})

it('goes back to signed-out with an error when Google refuses', async () => {
  const { identity } = setup(fakeIdentity([new Error('access_denied')]).identity)
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  expect(identity.requestToken).toHaveBeenCalled()
  expect(screen.getByTestId('status')).toHaveTextContent('signed-out')
  expect(latest.error).toBe('failed')
})

it('hands out the token and refuses before sign-in', async () => {
  setup()
  await expect(latest.tokens.getToken()).rejects.toMatchObject({ kind: 'auth' })
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  await expect(latest.tokens.getToken()).resolves.toBe('token-default')
})

it('renews silently five minutes before expiry', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const { identity } = setup(fakeIdentity([{ accessToken: 't1', expiresInSec: 3600, grantedScopes: ALL_SCOPES }, { accessToken: 't2', expiresInSec: 3600, grantedScopes: ALL_SCOPES }]).identity)
  await act(async () => latest.signIn())
  await act(async () => vi.advanceTimersByTimeAsync(3300 * 1000))
  expect(identity.requestToken).toHaveBeenLastCalledWith({ prompt: '', loginHint: 'ana@example.com' })
  await expect(latest.tokens.getToken()).resolves.toBe('t2')
})

it('refreshToken (used on 401) renews or fails with an auth error', async () => {
  setup(fakeIdentity([{ accessToken: 't1', expiresInSec: 3600, grantedScopes: ALL_SCOPES }, { accessToken: 't2', expiresInSec: 3600, grantedScopes: ALL_SCOPES }, new Error('nope')]).identity)
  await act(async () => latest.signIn())
  await expect(act(async () => latest.tokens.refreshToken())).resolves.toBe('t2')
  await act(async () => {
    await expect(latest.tokens.refreshToken()).rejects.toMatchObject({ kind: 'auth' })
  })
  expect(screen.getByTestId('status')).toHaveTextContent('needs-reconnect')
})

it('signs out: revokes, forgets the user and the remembered account', async () => {
  const { identity } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
  expect(identity.revoke).toHaveBeenCalledWith('token-default')
  expect(screen.getByTestId('status')).toHaveTextContent('signed-out')
  expect(screen.getByTestId('user')).toHaveTextContent('-')
  expect(localStorage.getItem('rabisco.account')).toBeNull()
})

it('explains when Drive access was not granted, then asks for consent again', async () => {
  localStorage.setItem('rabisco.account', JSON.stringify({ email: 'ana@example.com', name: 'Ana Souza' }))
  const { identity } = setup(
    fakeIdentity([{ accessToken: 'partial', expiresInSec: 3600, grantedScopes: ['openid', 'email', 'profile'] }]).identity,
  )
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  expect(screen.getByTestId('status')).toHaveTextContent('signed-out')
  expect(latest.error).toBe('missingDrive')
  await expect(latest.tokens.getToken()).rejects.toMatchObject({ kind: 'auth' })
  await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
  expect(identity.requestToken).toHaveBeenLastCalledWith({ prompt: 'consent', loginHint: 'ana@example.com' })
  expect(screen.getByTestId('status')).toHaveTextContent('signed-in')
})

it('shares one renewal between concurrent 401s (a single Google popup)', async () => {
  const { identity } = setup(
    fakeIdentity([
      { accessToken: 't1', expiresInSec: 3600, grantedScopes: ALL_SCOPES },
      { accessToken: 't2', expiresInSec: 3600, grantedScopes: ALL_SCOPES },
    ]).identity,
  )
  await act(async () => latest.signIn())
  const tokens = await act(async () => Promise.all([latest.tokens.refreshToken(), latest.tokens.refreshToken()]))
  expect(tokens).toEqual(['t2', 't2'])
  expect(identity.requestToken).toHaveBeenCalledTimes(2) // sign-in + one renewal
})

it('keeps a still-valid token when the early silent renewal fails', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setup(fakeIdentity([{ accessToken: 't1', expiresInSec: 3600, grantedScopes: ALL_SCOPES }, new Error('popup_blocked'), new Error('popup_blocked')]).identity)
  await act(async () => latest.signIn())
  await act(async () => vi.advanceTimersByTimeAsync(3300 * 1000))
  expect(screen.getByTestId('status')).toHaveTextContent('signed-in')
  await expect(latest.tokens.getToken()).resolves.toBe('t1')
  await act(async () => vi.advanceTimersByTimeAsync(300 * 1000))
  await act(async () => {
    await expect(latest.tokens.getToken()).rejects.toMatchObject({ kind: 'auth' })
  })
  expect(screen.getByTestId('status')).toHaveTextContent('needs-reconnect')
})
