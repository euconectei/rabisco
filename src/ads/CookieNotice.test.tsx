import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { CookieNotice } from './CookieNotice'

const ADSENSE = { client: 'ca-pub-1', slots: { editor: '11', files: '22' } }
const BRAZIL = { timeZone: 'America/Sao_Paulo', adsense: ADSENSE }

beforeEach(() => localStorage.clear())

it('asks in Brazil, with Accept and Decline side by side and a link to the policy', async () => {
  renderWithProviders(<CookieNotice />, { ads: BRAZIL })
  const notice = await screen.findByRole('region', { name: 'Cookies' })
  expect(notice).toHaveTextContent('O Rabisco é grátis graças a anúncios.')
  expect(screen.getByRole('button', { name: 'Aceitar' })).toHaveClass('button-secondary')
  expect(screen.getByRole('button', { name: 'Recusar' })).toHaveClass('button-secondary')
  expect(screen.getByRole('link', { name: 'Saiba mais' })).toHaveAttribute('href', '/privacy#cookies')
})

it.each([
  ['Aceitar', 'accepted'],
  ['Recusar', 'declined'],
])('"%s" hides the notice and stores %s', async (button, stored) => {
  renderWithProviders(<CookieNotice />, { ads: BRAZIL })
  await userEvent.click(await screen.findByRole('button', { name: button }))
  expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument()
  expect(localStorage.getItem('rabisco.adConsent')).toBe(stored)
})

it('stays away outside Brazil, without AdSense configured, and after an answer', async () => {
  renderWithProviders(<CookieNotice />, { ads: { timeZone: 'America/New_York', adsense: ADSENSE } })
  renderWithProviders(<CookieNotice />, { ads: { timeZone: 'America/Sao_Paulo', adsense: null } })
  localStorage.setItem('rabisco.adConsent', 'declined')
  renderWithProviders(<CookieNotice />, { ads: BRAZIL })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument()
})
