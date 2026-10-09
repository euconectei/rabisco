import { screen } from '@testing-library/react'
import { AppFooter } from './AppFooter'
import { renderWithProviders } from '../test/renderWithProviders'

afterEach(() => localStorage.clear())

it('shows the app version and a link to the news page', () => {
  renderWithProviders(<AppFooter />)
  expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Novidades/ })).toHaveAttribute('href', '/whats-new')
})

it('marks the link while there is unseen news', () => {
  renderWithProviders(<AppFooter />)
  expect(screen.getByRole('link', { name: 'Novidades (há novidades)' })).toBeInTheDocument()
})

it('drops the mark once the news was seen', () => {
  localStorage.setItem('rabisco.whatsNew.lastSeen', '2999-01-01')
  renderWithProviders(<AppFooter />, { lang: 'en' })
  expect(screen.getByRole('link', { name: 'News' })).toBeInTheDocument()
})
