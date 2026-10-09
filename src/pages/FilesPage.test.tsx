import 'vitest-canvas-mock'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { FilesPage } from './FilesPage'
import { DriveError } from '../drive/errors'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'

const pick = vi.hoisted(() => vi.fn())
vi.mock('../drive/usePicker', () => ({ useFilePicker: () => pick }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function setup(drive = memoryDrive(), auth = signedInAuth(), lang: 'pt-BR' | 'en' = 'pt-BR') {
  renderWithProviders(
    <>
      <FilesPage />
      <Where />
    </>,
    { route: '/app', drive: drive.client, auth, lang },
  )
  return { drive, auth }
}

beforeEach(() => pick.mockReset())

it('lists drawings newest first, without the extension, with a relative date', async () => {
  const drive = memoryDrive([
    { id: 'old', name: 'Antigo.excalidraw', content: '{}' },
    { id: 'new', name: 'Novo plano.excalidraw', content: '{}' },
  ])
  setup(drive)
  const list = await screen.findByRole('list', { name: 'Seus desenhos' })
  const links = within(list).getAllByRole('link')
  expect(links.map((link) => link.getAttribute('href'))).toEqual(['/edit/new', '/edit/old'])
  expect(links[0]).toHaveTextContent('Novo plano')
  expect(links[0]).not.toHaveTextContent('.excalidraw')
  expect(within(list).getAllByText(/^editado /)).toHaveLength(2)
})

it('shows the empty state', async () => {
  setup()
  expect(await screen.findByText('Nenhum arquivo ainda.')).toBeInTheDocument()
})

it('shows an error with a retry that reloads the list', async () => {
  const drive = memoryDrive([{ id: 'a', name: 'A.excalidraw', content: '{}' }])
  drive.client.listFiles.mockRejectedValueOnce(new DriveError('server', 'boom', 503))
  setup(drive)
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByRole('link', { name: /^A/ })).toBeInTheDocument()
})

it('"New" opens the new-drawing route', async () => {
  setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Novo' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/new')
})

it('opens a file chosen in the Drive Picker, and stays on cancel', async () => {
  pick.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'picked', name: 'X.excalidraw' })
  setup()
  const button = await screen.findByRole('button', { name: 'Abrir do Drive' })
  await userEvent.click(button)
  expect(screen.getByTestId('where')).toHaveTextContent('/app')
  await userEvent.click(button)
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/edit/picked'))
})

it('shows the account and signs out', async () => {
  const { auth } = setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Conta: Ana Souza' }))
  expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
  expect(auth.signOut).toHaveBeenCalled()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'))
})

it('works in English', async () => {
  setup(memoryDrive([{ id: 'a', name: 'Plan.excalidraw', content: '{}' }]), signedInAuth(), 'en')
  expect(await screen.findByRole('list', { name: 'Your drawings' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open from Drive' })).toBeInTheDocument()
  expect(screen.getByText(/^edited /)).toBeInTheDocument()
})
