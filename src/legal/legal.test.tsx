import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'

const signedOut = signedInAuth({ status: 'signed-out', user: null, hint: null })

beforeEach(() => localStorage.clear())

it.each([
  ['pt-BR', 'Política de Privacidade', 'Termos de Uso', 'Última atualização'],
  ['en', 'Privacy Policy', 'Terms of Use', 'Last updated'],
] as const)('both pages exist in %s, signed out, with the update date', (lang, privacy, terms, updated) => {
  const first = renderWithProviders(<PrivacyPage />, { lang, auth: signedOut })
  expect(screen.getByRole('heading', { level: 1, name: privacy })).toBeInTheDocument()
  expect(document.querySelector('.legal-updated')).toHaveTextContent(`${updated}: `)
  expect(screen.getAllByText(/rafaelfms@gmail.com/).length).toBeGreaterThan(0)
  first.unmount()
  renderWithProviders(<TermsPage />, { lang, auth: signedOut })
  expect(screen.getByRole('heading', { level: 1, name: terms })).toBeInTheDocument()
})

it('the policy lists every scope and every piece of local data the app uses', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  for (const item of [
    'drive.file',
    'drive.install',
    'rabisco.lang',
    'rabisco.mode',
    'rabisco.account',
    'rabisco.folderId',
    'rabisco.whatsNew.lastSeen',
    'rabisco.exportOptions',
    'rabisco.adConsent',
    'rabisco.moveOffer',
    'rabisco.localNotice',
  ]) {
    expect(screen.getAllByText(item).length).toBeGreaterThan(0)
  }
})

it.each([
  [
    'pt-BR',
    'No modo sem entrar, o Rabisco não envia seus desenhos a nenhum servidor: eles ficam só neste navegador. Com a conta Google, os desenhos vão para o seu próprio Google Drive. Os anúncios e o login do Google, quando usados, são carregados à parte.',
    'Esse banco só é criado quando você escolhe usar sem entrar; quem usa só o Google nunca o recebe.',
    'O script de login do Google é carregado na tela de entrada e também quando você aponta o mouse ou foca (Tab) o botão "Entrar"',
    'Ele não é carregado durante o uso sem entrar.',
  ],
  [
    'en',
    'In local mode (without signing in), Rabisco does not send your drawings to any server: they stay only in this browser. With a Google account, drawings go to your own Google Drive. Ads and Google sign-in, when used, are loaded separately.',
    'This database is created only when you choose to use without signing in; people who use only Google never receive it.',
    'The Google sign-in script is loaded on the sign-in screen and also when you hover over or focus (Tab) the "Sign in" button',
    'It is not loaded while you use Rabisco without signing in.',
  ],
] as const)('the policy states the storage and sign-in script rules exactly (%s)', (lang, server, db, script, notLoaded) => {
  renderWithProviders(<PrivacyPage />, { lang, auth: signedOut })
  const text = document.body.textContent ?? ''
  expect(text).toContain(server)
  expect(text).toContain(db)
  expect(text).toContain(script)
  expect(text).toContain(notLoaded)
  expect(text).not.toContain('só é carregado na tela de entrada ou ao clicar')
  expect(text).not.toContain('only on the sign-in screen or when you click')
})

it.each([
  ['pt-BR', 'rabisco.moveOffer', 'nesta sessão do navegador'],
  ['en', 'rabisco.localNotice', 'during this browser session'],
] as const)('the policy lists the sessionStorage keys (%s)', (lang, key, scope) => {
  renderWithProviders(<PrivacyPage />, { lang, auth: signedOut })
  const code = screen.getByText(key)
  expect(code.tagName).toBe('CODE')
  expect(code.closest('li')).toHaveTextContent(scope)
  expect(screen.getByText('sessionStorage')).toBeInTheDocument()
})

it.each([
  ['pt-BR', 'rabisco-local', 'No modo sem entrar, o Rabisco não envia seus desenhos a nenhum servidor', 'não apaga os desenhos locais'],
  ['en', 'rabisco-local', 'In local mode (without signing in), Rabisco does not send your drawings to any server', 'does not delete local drawings'],
] as const)('the policy says where local drawings live and that none go to a server (%s)', (lang, db, noServer, signOut) => {
  renderWithProviders(<PrivacyPage />, { lang, auth: signedOut })
  expect(document.body.textContent).toContain(db)
  expect(document.body.textContent).toContain(noServer)
  expect(document.body.textContent).toContain(signOut)
})

it.each([
  ['pt-BR', 'limpar os dados do navegador apaga os desenhos'],
  ['en', "clearing your browser's data deletes them"],
] as const)('the terms say that local drawings have no backup and clearing data deletes them (%s)', (lang, sentence) => {
  renderWithProviders(<TermsPage />, { lang, auth: signedOut })
  expect(document.body.textContent).toContain(sentence)
})

it('the policy carries the Google API Limited Use statement', () => {
  renderWithProviders(<PrivacyPage />, { lang: 'en', auth: signedOut })
  expect(screen.getByText(/Limited Use requirements/)).toBeInTheDocument()
})

it('external links open safely in a new tab', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  const external = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('https://'))
  expect(external.length).toBeGreaterThan(0)
  for (const link of external) {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

it('the cookies section shows the current choice and changes it', async () => {
  renderWithProviders(<PrivacyPage />, { route: '/privacy#cookies', auth: signedOut })
  const section = document.getElementById('cookies')!
  expect(section).toHaveTextContent('Você ainda não escolheu neste navegador.')
  await userEvent.click(screen.getByRole('button', { name: 'Recusar' }))
  expect(screen.getByRole('status')).toHaveTextContent('recusou os cookies de anúncios')
  expect(localStorage.getItem('rabisco.adConsent')).toBe('declined')
  await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }))
  expect(screen.getByRole('status')).toHaveTextContent('aceitou os cookies de anúncios')
})

it('scrolls to #cookies when opened with the hash', () => {
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  renderWithProviders(<PrivacyPage />, { route: '/privacy#cookies', auth: signedOut })
  expect(scroll).toHaveBeenCalledTimes(1)
})

it('shows no ad on the legal pages', () => {
  renderWithProviders(<PrivacyPage />, { auth: signedOut })
  expect(screen.queryByRole('complementary', { name: 'Anúncio' })).not.toBeInTheDocument()
})
