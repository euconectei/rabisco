import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../routes'
import { renderWithProviders } from '../test/renderWithProviders'
import { latestWhatsNewDate } from './entries'

afterEach(() => localStorage.clear())

it('opens from the footer link and shows the entries in Portuguese', async () => {
  renderWithProviders(<AppRoutes />, { route: '/' })
  await userEvent.click(screen.getByRole('link', { name: 'Novidades (há novidades)' }))
  expect(screen.getByRole('dialog', { name: 'Novidades' })).toBeInTheDocument()
  expect(screen.getByText('9 de outubro de 2026')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'O Rabisco chegou' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'Novidades agora abrem numa janela' })).toBeInTheDocument()
})

it('shows the same entries in English', async () => {
  renderWithProviders(<AppRoutes />, { route: '/', lang: 'en' })
  await userEvent.click(screen.getByRole('link', { name: 'News (something new)' }))
  expect(screen.getByText('October 9, 2026')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'Rabisco is here' })).toBeInTheDocument()
})

it('marks the news as seen when it opens, dropping the footer dot', async () => {
  renderWithProviders(<AppRoutes />, { route: '/' })
  await userEvent.click(screen.getByRole('link', { name: 'Novidades (há novidades)' }))
  expect(localStorage.getItem('rabisco.whatsNew.lastSeen')).toBe(latestWhatsNewDate)
  expect(screen.getByRole('link', { name: 'Novidades' })).toBeInTheDocument()
})

it('closes with Escape and returns focus to the link that opened it', async () => {
  renderWithProviders(<AppRoutes />, { route: '/' })
  const opener = screen.getByRole('link', { name: 'Novidades (há novidades)' })
  await userEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Novidades' })
  expect(dialog).toContainElement(document.activeElement as HTMLElement)
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

it('closes with the × button', async () => {
  renderWithProviders(<AppRoutes />, { route: '/' })
  await userEvent.click(screen.getByRole('link', { name: 'Novidades (há novidades)' }))
  await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('keeps /whats-new as a standalone page', () => {
  renderWithProviders(<AppRoutes />, { route: '/whats-new' })
  expect(screen.getByRole('heading', { level: 1, name: 'Novidades' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
