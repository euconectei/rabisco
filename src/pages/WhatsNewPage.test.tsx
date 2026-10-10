import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../routes'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../editor/EditorPage', () => ({ default: () => null }))

afterEach(() => localStorage.clear())

it('shows the launch entry with its date in Portuguese', () => {
  renderWithProviders(<AppRoutes />, { route: '/whats-new' })
  expect(screen.getByRole('heading', { level: 1, name: 'Novidades' })).toBeInTheDocument()
  expect(screen.getByText('9 de outubro de 2026')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: 'O Rabisco chegou' })).toBeInTheDocument()
})

it('shows the same entry in English', () => {
  renderWithProviders(<AppRoutes />, { route: '/whats-new', lang: 'en' })
  expect(screen.getByText('October 9, 2026')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: 'Rabisco is here' })).toBeInTheDocument()
})

it('marks the news as seen when opened', () => {
  renderWithProviders(<AppRoutes />, { route: '/whats-new' })
  expect(localStorage.getItem('rabisco.whatsNew.lastSeen')).toBe('2026-10-09')
})

it('goes home when opened directly, with no history to go back to', async () => {
  renderWithProviders(<AppRoutes />, { route: '/whats-new' })
  await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getAllByRole('link', { name: 'Começar, é grátis' })[0]).toBeInTheDocument()
})
