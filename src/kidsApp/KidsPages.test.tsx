import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../routes'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'

// The pages are lazy routes; the first import can take a few seconds in jsdom.
vi.setConfig({ testTimeout: 30_000 })
const LOAD = { timeout: 10_000 }

const signedOut = signedInAuth({ status: 'signed-out', user: null, hint: null })

beforeEach(() => localStorage.clear())

it.each([
  ['pt-BR', 'Rabisco Kids', 'Política de Privacidade do Rabisco Kids', 'Última atualização'],
  ['en', 'Rabisco Kids', 'Rabisco Kids Privacy Policy', 'Last updated'],
] as const)('both Rabisco Kids pages are public in %s and link to each other', async (lang, app, privacy, updated) => {
  renderWithProviders(<AppRoutes />, { route: '/rabisco-kids', lang, auth: signedOut })
  expect(await screen.findByRole('heading', { level: 1, name: app }, LOAD)).toBeInTheDocument()
  expect(document.querySelector('.legal-updated')).toHaveTextContent(`${updated}: `)
  await userEvent.click(screen.getAllByRole('link', { name: lang === 'pt-BR' ? 'Política de privacidade do Rabisco Kids' : 'Rabisco Kids privacy policy' })[0])
  expect(await screen.findByRole('heading', { level: 1, name: privacy }, LOAD)).toBeInTheDocument()
  expect(screen.getAllByText(/rafaelfms@gmail.com/).length).toBeGreaterThan(0)
})

it('the policy states the promises the app has to keep', async () => {
  renderWithProviders(<AppRoutes />, { route: '/rabisco-kids/privacy', auth: signedOut })
  await screen.findByRole('heading', { level: 1, name: 'Política de Privacidade do Rabisco Kids' }, LOAD)
  const text = document.body.textContent ?? ''
  for (const promise of [
    'o Rabisco Kids não coleta nenhum dado',
    'Não mostra propaganda.',
    'a versão da loja é publicada sem a permissão de internet do Android',
    'O Android pode incluir os dados do app no backup automático',
    'o Rabisco Kids não vê nem guarda dados de cartão, Pix ou conta',
    'Os traços que a criança faz numa página não são guardados',
  ]) {
    expect(text).toContain(promise)
  }
})

it('the Rabisco Kids pages carry no ad slot, no cookie notice and no Rabisco footer', async () => {
  for (const route of ['/rabisco-kids', '/rabisco-kids/privacy']) {
    const view = renderWithProviders(<AppRoutes />, { route, auth: signedOut })
    await screen.findByRole('heading', { level: 1 }, LOAD)
    expect(document.querySelector('.ad-label, ins.adsbygoogle')).toBeNull()
    expect(document.querySelector('script[src*="adsbygoogle"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Termos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Apoie' })).not.toBeInTheDocument()
    view.unmount()
  }
})

it('"Back" on a page opened directly goes to the Rabisco Kids page, not to the Rabisco landing', async () => {
  renderWithProviders(<AppRoutes />, { route: '/rabisco-kids/privacy', auth: signedOut })
  await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }, LOAD))
  expect(await screen.findByRole('heading', { level: 1, name: 'Rabisco Kids' }, LOAD)).toBeInTheDocument()
})
