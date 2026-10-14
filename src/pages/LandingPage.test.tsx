import { screen, within } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { renderWithProviders } from '../test/renderWithProviders'
import { ModeContext, type LocalSupport, type ModeValue } from '../mode/context'

type Options = NonNullable<Parameters<typeof renderWithProviders>[1]>

function show(options: Options = {}, localSupport: LocalSupport = 'available') {
  const mode: ModeValue = { mode: 'google', localSupport, enterLocal: vi.fn(), leaveLocal: vi.fn() }
  const result = renderWithProviders(
    <ModeContext.Provider value={mode}>
      <LandingPage />
    </ModeContext.Provider>,
    options,
  )
  return { ...result, mode }
}

it('leads with what Rabisco is and a way to start', () => {
  show()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pense no papel. Guarde no seu Drive.')
  expect(screen.getByText(/Mapas mentais e fluxos à mão no mesmo canvas/)).toBeInTheDocument()
  const starts = screen.getAllByRole('link', { name: 'Começar, é grátis' })
  expect(starts.length).toBeGreaterThanOrEqual(2)
  for (const link of starts) expect(link).toHaveAttribute('href', '/app')
})

it('shows the three features with their screenshots', () => {
  show()
  const features = screen.getByRole('region', { name: 'O que dá para fazer' })
  expect(within(features).getAllByRole('heading', { level: 3 })).toHaveLength(3)
  expect(within(features).getAllByRole('img')).toHaveLength(3)
})

it('explains where the drawings live and what the app can access', () => {
  show()
  const trust = screen.getByRole('region', { name: 'Seus desenhos são seus' })
  expect(within(trust).getByText(/ficam no seu Google Drive/)).toBeInTheDocument()
  expect(within(trust).getByText(/só os arquivos que ele mesmo criou ou que você abriu nele/)).toBeInTheDocument()
  expect(within(trust).getByRole('link', { name: /Código aberto/ })).toHaveAttribute(
    'href',
    'https://github.com/euconectei/rabisco',
  )
})

it('picks screenshots for the language and the color scheme', () => {
  const { container } = show({ lang: 'en' })
  const hero = screen.getByRole('img', { name: /Rabisco editor/ })
  expect(hero).toHaveAttribute('src', '/landing/en-canvas-light.webp')
  const dark = container.querySelector('source[srcset="/landing/en-canvas-dark.webp"]')
  expect(dark).toHaveAttribute('media', '(prefers-color-scheme: dark)')
})

it('is in English', () => {
  show({ lang: 'en' })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Think on paper. Keep it in your Drive.')
  expect(screen.getAllByRole('link', { name: "Get started, it's free" })[0]).toHaveAttribute('href', '/app')
})

it('shows one labeled, discreet ad right below the hero, in the first screen', async () => {
  show()
  const ad = await screen.findByRole('complementary', { name: 'Anúncio' })
  expect(await within(ad).findByRole('link', { name: /GitHub/ })).toBeInTheDocument()
})

it('asks about ad cookies in Brazil, as in the app', async () => {
  const adsense = { client: 'ca-pub-1', slots: { editor: '1', files: '2' } }
  show({ ads: { timeZone: 'America/Sao_Paulo', adsense } })
  expect(await screen.findByRole('region', { name: 'Cookies' })).toBeInTheDocument()
})

it('puts the ad between the hero and the features', () => {
  show()
  const hero = document.querySelector('.landing-hero')!
  const ad = document.querySelector('.landing-ad')!
  const features = screen.getByRole('region', { name: 'O que dá para fazer' })
  expect(hero.nextElementSibling).toBe(ad)
  expect(ad.nextElementSibling).toBe(features)
})

it('invites to try it without signing in, which enters local mode and opens the app', () => {
  const { mode } = show()
  const links = screen.getAllByRole('link', { name: 'Experimente sem entrar' })
  expect(links.length).toBeGreaterThanOrEqual(1)
  for (const link of links) expect(link).toHaveAttribute('href', '/app')
  links[0].click()
  expect(mode.enterLocal).toHaveBeenCalledTimes(1)
})

it('says it in English, and hides the invitation when the browser cannot keep drawings', () => {
  const { unmount } = show({ lang: 'en' })
  expect(screen.getAllByRole('link', { name: 'Try without signing in' }).length).toBeGreaterThanOrEqual(1)
  unmount()
  show({}, 'unavailable')
  expect(screen.queryByRole('link', { name: 'Experimente sem entrar' })).not.toBeInTheDocument()
})

it('explains that an exported PNG becomes a drawing again, in its own section between the features and the trust list', () => {
  show()
  const section = screen.getByRole('region', { name: 'PNG que volta a ser desenho' })
  expect(within(section).getByText(/Incluir dados editáveis/)).toBeInTheDocument()
  expect(within(section).getByRole('img', { name: 'Uma imagem PNG que volta a ser um desenho editável' }).tagName.toLowerCase()).toBe('svg')
  const features = screen.getByRole('region', { name: 'O que dá para fazer' })
  const trust = screen.getByRole('region', { name: 'Seus desenhos são seus' })
  expect(features.nextElementSibling).toBe(section)
  expect(section.nextElementSibling).toBe(trust)
})

it('has the editable PNG section in English', () => {
  show({ lang: 'en' })
  expect(screen.getByRole('region', { name: 'A PNG that turns back into a drawing' })).toBeInTheDocument()
})
