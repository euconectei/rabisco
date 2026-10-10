import { GIS_SCRIPT_URL, loadIdentityClient, SCOPES, resetIdentityLoaderForTests } from './googleIdentity'

type Callback = (response: Record<string, unknown>) => void

function installFakeGis(respond: (callback: Callback, errorCallback: (e: { type: string }) => void) => void) {
  const initTokenClient = vi.fn((config: { callback: Callback; error_callback: (e: { type: string }) => void }) => ({
    requestAccessToken: vi.fn(() => respond(config.callback, config.error_callback)),
  }))
  const revoke = vi.fn((_token: string, done: () => void) => done())
  ;(window as unknown as { google: unknown }).google = { accounts: { oauth2: { initTokenClient, revoke } } }
  return { initTokenClient, revoke }
}

function finishScriptLoad() {
  const script = document.head.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_URL}"]`)
  script?.dispatchEvent(new Event('load'))
}

beforeEach(() => {
  resetIdentityLoaderForTests()
  document.head.innerHTML = ''
})
afterEach(() => {
  delete (window as unknown as { google?: unknown }).google
})

it('injects the Google script once and requests a token with the right scopes', async () => {
  const gis = installFakeGis((callback) =>
    callback({ access_token: 'tok', expires_in: '3599', scope: 'openid https://www.googleapis.com/auth/drive.file email' }),
  )
  const first = loadIdentityClient('client-1')
  const second = loadIdentityClient('client-1')
  finishScriptLoad()
  const [client] = await Promise.all([first, second])
  expect(document.head.querySelectorAll(`script[src="${GIS_SCRIPT_URL}"]`)).toHaveLength(1)

  await expect(client.requestToken({ prompt: '', loginHint: 'ana@example.com' })).resolves.toEqual({
    accessToken: 'tok',
    expiresInSec: 3599,
    grantedScopes: ['openid', 'https://www.googleapis.com/auth/drive.file', 'email'],
  })
  expect(gis.initTokenClient).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-1', scope: SCOPES }))
  const tokenClient = gis.initTokenClient.mock.results[0].value
  expect(tokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: '', login_hint: 'ana@example.com' })
})

it('rejects when Google returns an error or the popup is closed', async () => {
  installFakeGis((callback) => callback({ error: 'access_denied' }))
  const loading = loadIdentityClient('c')
  finishScriptLoad()
  const client = await loading
  await expect(client.requestToken({ prompt: 'consent' })).rejects.toThrow('access_denied')

  installFakeGis((_callback, errorCallback) => errorCallback({ type: 'popup_closed' }))
  await expect(client.requestToken({ prompt: 'consent' })).rejects.toThrow('popup_closed')
})

it('fails clearly when the script cannot load', async () => {
  const loading = loadIdentityClient('c')
  document.head.querySelector('script')?.dispatchEvent(new Event('error'))
  await expect(loading).rejects.toThrow('Google sign-in could not be loaded')
})

it('revokes tokens', async () => {
  const gis = installFakeGis(() => {})
  const loading = loadIdentityClient('c')
  finishScriptLoad()
  await (await loading).revoke('tok')
  expect(gis.revoke).toHaveBeenCalledWith('tok', expect.any(Function))
})

it('asks for drive.install so Rabisco shows up in Drive\'s "Open with" menu', () => {
  expect(SCOPES.split(' ')).toEqual(
    expect.arrayContaining(['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.install']),
  )
})
