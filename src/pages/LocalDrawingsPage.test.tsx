import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { resetMoveOffer, type MoveReport } from '../local/move'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders } from '../test/renderWithProviders'
import { LocalDrawingsPage } from './LocalDrawingsPage'

const moveLocalDrawings = vi.hoisted(() => vi.fn())
vi.mock('../local/db', async (importOriginal) => ({ ...(await importOriginal<typeof import('../local/db')>()), localDbExists: async () => true }))
vi.mock('../local/move', async (importOriginal) => ({ ...(await importOriginal<typeof import('../local/move')>()), moveLocalDrawings }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const report = (overrides: Partial<MoveReport> = {}): MoveReport => ({ total: 0, moved: 0, failed: 0, failures: [], busy: false, ...overrides })

function setup(files: Array<{ id: string; name: string; content: string }>, options: Parameters<typeof renderWithProviders>[1] = {}) {
  const local = memoryDrive(files)
  const drive = memoryDrive()
  renderWithProviders(
    <>
      <LocalDrawingsPage />
      <Where />
    </>,
    { route: '/local', drive: drive.client, localDrive: local.client, ...options },
  )
  return { local, drive }
}

beforeEach(() => {
  moveLocalDrawings.mockReset()
  resetMoveOffer()
})

it('lists the drawings kept in this browser as cards that open them', async () => {
  setup([{ id: 'local-1', name: 'Plano.excalidraw', content: '{}' }])
  const list = await screen.findByRole('list', { name: 'Seus desenhos' })
  expect(within(list).getByRole('link', { name: /Plano/ })).toHaveAttribute('href', '/edit/local-1')
  expect(screen.getByRole('heading', { level: 1, name: 'Desenhos locais' })).toBeInTheDocument()
  expect(screen.getByText('Estes desenhos estão só neste navegador.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Meus arquivos' })).toHaveAttribute('href', '/app')
})

it('says when there is nothing local', async () => {
  setup([])
  expect(await screen.findByText('Nenhum desenho local.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Mover todos para o Drive' })).not.toBeInTheDocument()
})

it('moves all of them to Drive and shows the result', async () => {
  moveLocalDrawings.mockResolvedValue(report({ total: 2, moved: 2 }))
  const { drive } = setup([
    { id: 'local-1', name: 'A.excalidraw', content: '{}' },
    { id: 'local-2', name: 'B.excalidraw', content: '{}' },
  ])
  await userEvent.click(await screen.findByRole('button', { name: 'Mover todos para o Drive' }))
  expect(await screen.findByText('Os 2 desenhos foram movidos para o Drive.')).toBeInTheDocument()
  expect(moveLocalDrawings).toHaveBeenCalledWith(drive.client, expect.anything())
})

it('offers to retry the ones that failed', async () => {
  moveLocalDrawings.mockResolvedValue(report({ total: 2, moved: 1, failed: 1, failures: [{ id: 'local-2', name: 'B', reason: 'error' }] }))
  setup([
    { id: 'local-1', name: 'A.excalidraw', content: '{}' },
    { id: 'local-2', name: 'B.excalidraw', content: '{}' },
  ])
  await userEvent.click(await screen.findByRole('button', { name: 'Mover todos para o Drive' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Movidos: 1. Com falha: 1.')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await waitFor(() => expect(moveLocalDrawings).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ ids: ['local-2'] })))
})

it('shows a message when this browser storage cannot be read', async () => {
  const local = memoryDrive()
  local.client.listFiles.mockRejectedValue(new Error('blocked'))
  renderWithProviders(<LocalDrawingsPage />, { route: '/local', localDrive: local.client })
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir o armazenamento deste navegador')
})

it('sends someone who is not signed in to the files page, where the local drawings are', async () => {
  setup([], { mode: 'local' })
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/app'))
})
