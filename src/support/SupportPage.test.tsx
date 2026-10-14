import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { PIX_KEY, pixPayload } from './pix'
import SupportPage from './SupportPage'

const signedOut = signedInAuth({ status: 'signed-out', user: null, hint: null })

it('is public and shows the Pix QR code, the key and the repository link', async () => {
  renderWithProviders(<SupportPage />, { route: '/apoie', auth: signedOut })
  expect(screen.getByRole('heading', { level: 1, name: 'Apoie o Rabisco' })).toBeInTheDocument()
  expect(screen.getByText(PIX_KEY)).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'QR code do Pix do Rabisco' })).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'))
  const repo = screen.getByRole('link', { name: 'Ver o repositório' })
  expect(repo).toHaveAttribute('href', 'https://github.com/euconectei/rabisco')
  expect(repo).toHaveAttribute('rel', 'noopener noreferrer')
})

it('copies the Pix "copia e cola" code and says so', async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  renderWithProviders(<SupportPage />, { route: '/apoie', auth: signedOut })
  await userEvent.click(screen.getByRole('button', { name: 'Copiar código Pix' }))
  expect(writeText).toHaveBeenCalledWith(pixPayload())
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Código copiado'))
})

it('works in English and shows no ad', () => {
  renderWithProviders(<SupportPage />, { route: '/apoie', auth: signedOut, lang: 'en' })
  expect(screen.getByRole('heading', { level: 1, name: 'Support Rabisco' })).toBeInTheDocument()
  expect(screen.queryByRole('complementary', { name: 'Anúncio' })).not.toBeInTheDocument()
})
