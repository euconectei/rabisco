// /edit/new loads scene.ts, which pulls in the real Excalidraw (needs a canvas).
import 'vitest-canvas-mock'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from './routes'
import { renderWithProviders, signedInAuth } from './test/renderWithProviders'

vi.setConfig({ testTimeout: 30_000 })

vi.mock('./editor/EditorPage', () => ({
  default: () => <div data-testid="editor-page" />,
}))

it('landing shows the title, tagline and leads to the files page', async () => {
  renderWithProviders(<AppRoutes />)
  expect(screen.getByRole('heading', { level: 1, name: 'Pense no papel. Guarde no seu Drive.' })).toBeInTheDocument()
  expect(screen.getByText(/salvos no seu Google Drive/)).toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('link', { name: 'Começar, é grátis' })[0])
  expect(await screen.findByRole('heading', { name: 'Seu primeiro rabisco começa aqui' })).toBeInTheDocument()
})

it('files page shows the empty state and opens a new drawing', async () => {
  renderWithProviders(<AppRoutes />, { route: '/app' })
  expect(await screen.findByText('Seu primeiro rabisco começa aqui')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Criar o primeiro desenho' }))
  expect(await screen.findByTestId('editor-page', {}, { timeout: 10_000 })).toBeInTheDocument()
})

it('renders pages in English', () => {
  renderWithProviders(<AppRoutes />, { route: '/', lang: 'en' })
  expect(screen.getAllByRole('link', { name: "Get started, it's free" })[0]).toBeInTheDocument()
})

it('unknown routes show the 404 page with a way home', async () => {
  renderWithProviders(<AppRoutes />, { route: '/nope/really' })
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }))
  expect(screen.getAllByRole('link', { name: 'Começar, é grátis' })[0]).toBeInTheDocument()
})

it('asks to sign in before showing private pages', () => {
  renderWithProviders(<AppRoutes />, { route: '/app', auth: signedInAuth({ status: 'signed-out', user: null, hint: null }) })
  expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
  expect(screen.queryByText('Seu primeiro rabisco começa aqui')).not.toBeInTheDocument()
})

it('legal pages are public and linked from the footer', async () => {
  renderWithProviders(<AppRoutes />, { route: '/', auth: signedInAuth({ status: 'signed-out', user: null, hint: null }) })
  await userEvent.click(screen.getByRole('link', { name: 'Privacidade' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Termos' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/privacy#cookies')
})

it('the support page is public and linked from the footer', async () => {
  renderWithProviders(<AppRoutes />, { route: '/', auth: signedInAuth({ status: 'signed-out', user: null, hint: null }) })
  await userEvent.click(screen.getByRole('link', { name: 'Apoie' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Apoie o Rabisco' })).toBeInTheDocument()
})

it('the AI docs page is public and linked from the footer', async () => {
  renderWithProviders(<AppRoutes />, { route: '/', auth: signedInAuth({ status: 'signed-out', user: null, hint: null }) })
  await userEvent.click(screen.getByRole('link', { name: 'Criar com IA' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Criar mapas com IA' })).toBeInTheDocument()
})
