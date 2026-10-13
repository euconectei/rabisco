import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'

const signedOut = signedInAuth({ status: 'signed-out', user: null, hint: null })

beforeEach(() => localStorage.clear())

it.each([
  ['pt-BR', 'Política de Privacidade', 'Termos de Uso', 'Última atualização'],
  ['en', 'Privacy Policy', 'Terms of Use', 'Last updated'],
] as const)('both pages exist in %s, signed out, with the update date', (lang, privacy, terms, updated) => {
  const first = renderWithProviders(<PrivacyPage />, { lang, auth: signedOut })
  expect(screen.getByRole('heading', { level: 1, name: privacy })).toBeInTheDocument()
  expect(document.querySelector('.legal-updated')).toHaveTextContent(`${updated}: `)
  expect(screen.getAllByText(/rafaelfms@gmail.com/).length).toBeGreaterThan(0)
  first.unmount()
  renderWithProviders(<TermsPage />, { lang, auth: signedOut })
  expect(screen.getByRole('heading', { level: 1, name: terms })).toBeInTheDocument()
})

it('the policy lists every scope and every piece of local data the app uses', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  for (const item of [
    'drive.file',
    'drive.install',
    'rabisco.lang',
    'rabisco.account',
    'rabisco.folderId',
    'rabisco.whatsNew.lastSeen',
    'rabisco.exportOptions',
    'rabisco.adConsent',
  ]) {
    expect(screen.getAllByText(item).length).toBeGreaterThan(0)
  }
})

it('the policy carries the Google API Limited Use statement', () => {
  renderWithProviders(<PrivacyPage />, { lang: 'en', auth: signedOut })
  expect(screen.getByText(/Limited Use requirements/)).toBeInTheDocument()
})

it('external links open safely in a new tab', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  const external = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('https://'))
  expect(external.length).toBeGreaterThan(0)
  for (const link of external) {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

it('the cookies section shows the current choice and changes it', async () => {
  renderWithProviders(<PrivacyPage />, { route: '/privacy#cookies', auth: signedOut })
  const section = document.getElementById('cookies')!
  expect(section.parentElement).toHaveTextContent('Você ainda não escolheu neste navegador.')
  await userEvent.click(screen.getByRole('button', { name: 'Recusar' }))
  expect(screen.getByRole('status')).toHaveTextContent('recusou os cookies de anúncios')
  expect(localStorage.getItem('rabisco.adConsent')).toBe('declined')
  await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }))
  expect(screen.getByRole('status')).toHaveTextContent('aceitou os cookies de anúncios')
})

it('scrolls to #cookies when opened with the hash', () => {
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  renderWithProviders(<PrivacyPage />, { route: '/privacy#cookies', auth: signedOut })
  expect(scroll).toHaveBeenCalledTimes(1)
})

it('shows no ad on the legal pages', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  expect(screen.queryByRole('complementary', { name: 'Anúncio' })).not.toBeInTheDocument()
})
