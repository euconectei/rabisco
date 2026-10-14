import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { LocalNotice } from './LocalNotice'

const signedOut = () => signedInAuth({ status: 'signed-out', user: null, hint: null })

it('tells that the drawings stay only in this browser, and offers to sign in', async () => {
  const auth = signedOut()
  renderWithProviders(<LocalNotice />, { mode: 'local', auth })
  const notice = screen.getByRole('complementary', { name: 'Aviso sobre o modo local' })
  expect(notice).toHaveTextContent('Seus desenhos ficam só neste navegador. Entre com Google para guardá-los no Drive.')
  expect(notice).toHaveTextContent('Limpar os dados do navegador apaga os desenhos')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(auth.signIn).toHaveBeenCalled()
})

it('says it in English', () => {
  renderWithProviders(<LocalNotice />, { mode: 'local', auth: signedOut(), lang: 'en' })
  expect(screen.getByRole('complementary', { name: 'About local mode' })).toHaveTextContent('Your drawings stay only in this browser.')
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
})

it('renders nothing in the Google mode', () => {
  renderWithProviders(<LocalNotice />, { mode: 'google' })
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
})

it('follows the open drawing when given one: nothing for a Drive file, the notice for a local one', () => {
  const { unmount } = renderWithProviders(<LocalNotice fileId="1AbCdEf" />, { mode: 'local', auth: signedOut() })
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  unmount()
  renderWithProviders(<LocalNotice fileId="local-1234" />, { mode: 'google', auth: signedOut() })
  expect(screen.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toBeInTheDocument()
})

it('for a local drawing opened after signing in, points to the list where it can be moved instead of asking to sign in', () => {
  renderWithProviders(<LocalNotice fileId="local-1234" />, { mode: 'google' })
  expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Desenhos locais' })).toHaveAttribute('href', '/local')
})
