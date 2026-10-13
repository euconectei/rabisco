import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAds } from './useAds'
import { renderWithProviders } from '../test/renderWithProviders'
import { AdSlot } from './AdSlot'
import { loadAdsense, pushAd } from './adsense'

vi.mock('./adsense', () => ({ loadAdsense: vi.fn(), pushAd: vi.fn() }))

const ADSENSE = { client: 'ca-pub-1', slots: { editor: '11', files: '22' } }

function Decline() {
  const { setConsent } = useAds()
  return <button type="button" onClick={() => setConsent('declined')}>decline</button>
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(loadAdsense).mockReset().mockResolvedValue(undefined)
  vi.mocked(pushAd).mockReset()
})

it('shows the labeled house ad in Europe, loading nothing', async () => {
  renderWithProviders(<AdSlot placement="files" />)
  const link = await screen.findByRole('link', { name: /Conheça e contribua no GitHub/ })
  expect(link).toHaveAttribute('href', 'https://github.com/euconectei/rabisco')
  expect(screen.getByText('Anúncio')).toBeInTheDocument()
  expect(loadAdsense).not.toHaveBeenCalled()
})

it('reserves the space but loads nothing while pending', () => {
  renderWithProviders(<AdSlot placement="files" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
  expect(document.querySelector('.ad-slot')).toHaveAttribute('data-ad-state', 'pending')
  expect(screen.queryByText('Anúncio')).not.toBeInTheDocument()
  expect(loadAdsense).not.toHaveBeenCalled()
})

it('renders nothing for exempt accounts', async () => {
  const { hashEmail } = await vi.importActual<typeof import('./exempt')>('./exempt')
  renderWithProviders(<AdSlot placement="files" />, {
    ads: { timeZone: 'America/New_York', adsense: ADSENSE, exemptHashes: [await hashEmail('ana@example.com')] },
  })
  await waitFor(() => expect(document.querySelector('.ad-slot')).toBeNull())
  expect(loadAdsense).not.toHaveBeenCalled()
})

it('mounts one <ins> with the slot of its placement and pushes it after the script loads', async () => {
  renderWithProviders(<AdSlot placement="editor" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
  await waitFor(() => expect(pushAd).toHaveBeenCalledTimes(1))
  const ins = document.querySelector('ins.adsbygoogle')!
  expect(ins).toHaveAttribute('data-ad-client', 'ca-pub-1')
  expect(ins).toHaveAttribute('data-ad-slot', '11')
  expect(vi.mocked(pushAd).mock.calls[0][0]).toBe(ins)
  expect(loadAdsense).toHaveBeenCalledWith('ca-pub-1')
})

it('falls back to the house ad when the script fails', async () => {
  vi.mocked(loadAdsense).mockRejectedValue(new Error('blocked'))
  renderWithProviders(<AdSlot placement="files" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
  expect(await screen.findByRole('link', { name: /GitHub/ })).toBeInTheDocument()
  expect(document.querySelector('ins.adsbygoogle')).toBeNull()
})

it('falls back to the house ad when the slot comes back unfilled', async () => {
  renderWithProviders(<AdSlot placement="files" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
  await waitFor(() => expect(pushAd).toHaveBeenCalled())
  act(() => document.querySelector('ins.adsbygoogle')!.setAttribute('data-ad-status', 'unfilled'))
  expect(await screen.findByRole('link', { name: /GitHub/ })).toBeInTheDocument()
})

it('falls back after 5 s with no status, and keeps a filled ad', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  try {
    const first = renderWithProviders(<AdSlot placement="files" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
    await waitFor(() => expect(pushAd).toHaveBeenCalled())
    act(() => document.querySelector('ins.adsbygoogle')!.setAttribute('data-ad-status', 'filled'))
    await act(async () => vi.advanceTimersByTime(6_000))
    expect(document.querySelector('ins.adsbygoogle')).not.toBeNull()
    first.unmount()

    renderWithProviders(<AdSlot placement="files" />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
    await waitFor(() => expect(pushAd).toHaveBeenCalledTimes(2))
    await act(async () => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('link', { name: /GitHub/ })).toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

it('switches a mounted AdSense slot to the house ad when the person declines after accepting', async () => {
  localStorage.setItem('rabisco.adConsent', 'accepted')
  renderWithProviders(
    <>
      <AdSlot placement="files" />
      <Decline />
    </>,
    { ads: { timeZone: 'America/Sao_Paulo', adsense: ADSENSE } },
  )
  await waitFor(() => expect(document.querySelector('ins.adsbygoogle')).not.toBeNull())
  await userEvent.click(screen.getByRole('button', { name: 'decline' }))
  expect(document.querySelector('ins.adsbygoogle')).toBeNull()
  expect(screen.getByRole('link', { name: /GitHub/ })).toBeInTheDocument()
  expect(pushAd).toHaveBeenCalledTimes(1)
})
