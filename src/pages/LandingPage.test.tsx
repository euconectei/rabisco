import { screen, within } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { renderWithProviders } from '../test/renderWithProviders'

it('leads with what Rabisco is and a way to start', () => {
  renderWithProviders(<LandingPage />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pense no papel. Guarde no seu Drive.')
  expect(screen.getByText(/Mapas mentais e fluxos à mão no mesmo canvas/)).toBeInTheDocument()
  const starts = screen.getAllByRole('link', { name: 'Começar, é grátis' })
  expect(starts.length).toBeGreaterThanOrEqual(2)
  for (const link of starts) expect(link).toHaveAttribute('href', '/app')
})

it('shows the three features with their screenshots', () => {
  renderWithProviders(<LandingPage />)
  const features = screen.getByRole('region', { name: 'O que dá para fazer' })
  expect(within(features).getAllByRole('heading', { level: 3 })).toHaveLength(3)
  expect(within(features).getAllByRole('img')).toHaveLength(3)
})

it('explains where the drawings live and what the app can access', () => {
  renderWithProviders(<LandingPage />)
  const trust = screen.getByRole('region', { name: 'Seus desenhos são seus' })
  expect(within(trust).getByText(/ficam no seu Google Drive/)).toBeInTheDocument()
  expect(within(trust).getByText(/só os arquivos que ele mesmo criou ou que você abriu nele/)).toBeInTheDocument()
  expect(within(trust).getByRole('link', { name: /Código aberto/ })).toHaveAttribute(
    'href',
    'https://github.com/euconectei/rabisco',
  )
})

it('picks screenshots for the language and the color scheme', () => {
  const { container } = renderWithProviders(<LandingPage />, { lang: 'en' })
  const hero = screen.getByRole('img', { name: /Rabisco editor/ })
  expect(hero).toHaveAttribute('src', '/landing/en-canvas-light.webp')
  const dark = container.querySelector('source[srcset="/landing/en-canvas-dark.webp"]')
  expect(dark).toHaveAttribute('media', '(prefers-color-scheme: dark)')
})

it('is in English', () => {
  renderWithProviders(<LandingPage />, { lang: 'en' })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Think on paper. Keep it in your Drive.')
  expect(screen.getAllByRole('link', { name: "Get started, it's free" })[0]).toHaveAttribute('href', '/app')
})
