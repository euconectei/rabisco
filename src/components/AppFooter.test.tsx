import { screen } from '@testing-library/react'
import { AppFooter } from './AppFooter'
import { renderWithProviders } from '../test/renderWithProviders'

afterEach(() => localStorage.clear())

it('shows the app version and a link to the news page', () => {
  renderWithProviders(<AppFooter />)
  expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Novidades/ })).toHaveAttribute('href', '/whats-new')
})

it('credits the community and links to the source code', () => {
  renderWithProviders(<AppFooter />)
  expect(screen.getByText(/Feito pela comunidade com/)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'amor' })).toHaveClass('heartbeat')
  const github = screen.getByRole('link', { name: 'GitHub' })
  expect(github).toHaveAttribute('href', 'https://github.com/euconectei/rabisco')
  expect(github).toHaveAttribute('rel', 'noopener noreferrer')
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
