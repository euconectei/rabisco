import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext } from '../auth/context'
import { ModeContext, type AppMode } from '../mode/context'
import { signedInAuth } from '../test/renderWithProviders'
import { AdsProvider } from './AdsProvider'
import { hashEmail } from './exempt'
import { useAds } from './useAds'

const ADSENSE = { client: 'ca-pub-1', slots: { editor: '11', files: '22' } }

function Probe() {
  const ads = useAds()
  return (
    <>
      <p data-testid="decision">{ads.decision}</p>
      <p data-testid="notice">{String(ads.showCookieNotice)}</p>
      <button type="button" onClick={() => ads.setConsent('accepted')}>accept</button>
    </>
  )
}

function renderAds(email: string, props: { timeZone: string; exemptHashes?: string[] }) {
  const auth = signedInAuth({ user: { email, name: 'X' } })
  const view = render(
    <AuthContext.Provider value={auth}>
      <AdsProvider adsense={ADSENSE} exemptHashes={[]} {...props}>
        <Probe />
      </AdsProvider>
    </AuthContext.Provider>,
  )
  return { ...view, auth }
}

beforeEach(() => localStorage.clear())

it('starts pending, then decides', async () => {
  renderAds('ana@example.com', { timeZone: 'America/New_York' })
  expect(screen.getByTestId('decision')).toHaveTextContent('pending')
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('adsense'))
})

it('exempt accounts get none, even in Brazil, with no notice', async () => {
  renderAds('ana@example.com', { timeZone: 'America/Sao_Paulo', exemptHashes: [await hashEmail('ana@example.com')] })
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('none'))
  expect(screen.getByTestId('notice')).toHaveTextContent('false')
})

it('in Brazil, shows the notice and the house ad until "Accept", then AdSense, and remembers it', async () => {
  renderAds('ana@example.com', { timeZone: 'America/Sao_Paulo' })
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('house'))
  expect(screen.getByTestId('notice')).toHaveTextContent('true')
  await userEvent.click(screen.getByRole('button', { name: 'accept' }))
  expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
  expect(screen.getByTestId('notice')).toHaveTextContent('false')
  expect(localStorage.getItem('rabisco.adConsent')).toBe('accepted')
})

it('keeps the choice in memory when storage refuses it', async () => {
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  renderAds('ana@example.com', { timeZone: 'America/Sao_Paulo' })
  await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent('true'))
  await userEvent.click(screen.getByRole('button', { name: 'accept' }))
  expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
  set.mockRestore()
})

it('recomputes exemption for a new account instead of reusing the old answer', async () => {
  const owner = await hashEmail('ana@example.com')
  const { rerender, auth } = renderAds('ana@example.com', { timeZone: 'America/New_York', exemptHashes: [owner] })
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('none'))
  rerender(
    <AuthContext.Provider value={{ ...auth, user: { email: 'bia@example.com', name: 'Bia' } }}>
      <AdsProvider adsense={ADSENSE} exemptHashes={[owner]} timeZone="America/New_York">
        <Probe />
      </AdsProvider>
    </AuthContext.Provider>,
  )
  expect(screen.getByTestId('decision')).toHaveTextContent('pending')
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('adsense'))
})

it('a visitor with no account is never exempt, so the landing page does not wait', async () => {
  render(
    <AuthContext.Provider value={signedInAuth({ status: 'signed-out', user: null, hint: null })}>
      <AdsProvider adsense={ADSENSE} timeZone="America/New_York">
        <Probe />
      </AdsProvider>
    </AuthContext.Provider>,
  )
  expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
})

it('uses the remembered account to exempt a signed-out visitor', async () => {
  const hint = { email: 'ana@example.com', name: 'Ana' }
  render(
    <AuthContext.Provider value={signedInAuth({ status: 'signed-out', user: null, hint })}>
      <AdsProvider adsense={ADSENSE} timeZone="America/New_York" exemptHashes={[await hashEmail('ana@example.com')]}>
        <Probe />
      </AdsProvider>
    </AuthContext.Provider>,
  )
  expect(screen.getByTestId('decision')).toHaveTextContent('pending')
  await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('none'))
})

describe('local mode', () => {
  const hint = { email: 'ana@example.com', name: 'Ana' }

  async function renderInMode(mode: AppMode, auth = signedInAuth({ status: 'signed-out', user: null, hint })) {
    const exemptHashes = [await hashEmail('ana@example.com')]
    render(
      <AuthContext.Provider value={auth}>
        <ModeContext.Provider value={{ mode, localSupport: 'available', enterLocal: vi.fn(), leaveLocal: vi.fn() }}>
          <AdsProvider adsense={ADSENSE} timeZone="America/New_York" exemptHashes={exemptHashes}>
            <Probe />
          </AdsProvider>
        </ModeContext.Provider>
      </AuthContext.Provider>,
    )
  }

  it('treats the owner remembered on this device as a plain visitor', async () => {
    await renderInMode('local')
    // Decided at once (nothing to look up) and never exempt: ads follow the visitor rules.
    expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
  })

  it('does not exempt a still-signed-in owner either', async () => {
    await renderInMode('local', signedInAuth({ user: { email: 'ana@example.com', name: 'Ana' } }))
    expect(screen.getByTestId('decision')).toHaveTextContent('adsense')
  })

  it('still exempts the same owner in the google mode', async () => {
    await renderInMode('google')
    await waitFor(() => expect(screen.getByTestId('decision')).toHaveTextContent('none'))
  })
})
