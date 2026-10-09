import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from './routes'
import { renderWithProviders, signedInAuth } from './test/renderWithProviders'

vi.mock('./editor/EditorPage', () => ({
  default: () => <div data-testid="editor-page" />,
}))

it('landing shows the name, tagline and leads to the files page', async () => {
  renderWithProviders(<AppRoutes />)
  expect(screen.getByRole('heading', { name: 'Rabisco' })).toBeInTheDocument()
  expect(screen.getByText(/salvos no seu Google Drive/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Começar' }))
  expect(screen.getByRole('heading', { name: 'Meus arquivos' })).toBeInTheDocument()
})

it('files page shows the empty state and opens a new drawing', async () => {
  renderWithProviders(<AppRoutes />, { route: '/app' })
  expect(screen.getByText('Nenhum arquivo ainda.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Novo' }))
  expect(await screen.findByTestId('editor-page')).toBeInTheDocument()
})

it('renders pages in English', () => {
  renderWithProviders(<AppRoutes />, { route: '/', lang: 'en' })
  expect(screen.getByRole('link', { name: 'Get started' })).toBeInTheDocument()
})

it('unknown routes show the 404 page with a way home', async () => {
  renderWithProviders(<AppRoutes />, { route: '/nope/really' })
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }))
  expect(screen.getByRole('link', { name: 'Começar' })).toBeInTheDocument()
})

it('asks to sign in before showing private pages', () => {
  renderWithProviders(<AppRoutes />, { route: '/app', auth: signedInAuth({ status: 'signed-out', user: null, hint: null }) })
  expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
  expect(screen.queryByText('Nenhum arquivo ainda.')).not.toBeInTheDocument()
})
