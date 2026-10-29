import { screen } from '@testing-library/react'
import { AppRoutes } from './routes'
import { renderWithProviders } from './test/renderWithProviders'

// The lazy pages never arrive here, so what stays on screen is the fallback of each route.
vi.mock('./editor/EditorPage', () => new Promise(() => {}))
vi.mock('./editor/NewFileRedirect', () => new Promise(() => {}))
vi.mock('./legal/PrivacyPage', () => new Promise(() => {}))

const waiting = { timeout: 3000 }

it('tells a drawing being opened that it is being opened, not that the editor is loading', async () => {
  renderWithProviders(<AppRoutes />, { route: '/edit/abc' })
  expect(await screen.findByText('Abrindo o desenho…', {}, waiting)).toBeInTheDocument()
})

it('tells a drawing being created that it is being created, so the whole flow reads the same', async () => {
  renderWithProviders(<AppRoutes />, { route: '/edit/new' })
  expect(await screen.findByText('Criando um desenho novo…', {}, waiting)).toBeInTheDocument()
})

it('does not talk about the editor on a page that has none', async () => {
  renderWithProviders(<AppRoutes />, { route: '/privacy' })
  expect(await screen.findByText('Carregando…', {}, waiting)).toBeInTheDocument()
  expect(screen.queryByText('Carregando o editor…')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Meus arquivos' })).not.toBeInTheDocument()
})
