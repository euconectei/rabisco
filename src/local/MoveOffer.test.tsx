import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { MoveOffer } from './MoveOffer'
import { moveOfferAnswered, resetMoveOffer, type MoveReport } from './move'

const moveLocalDrawings = vi.hoisted(() => vi.fn())
vi.mock('./move', async (importOriginal) => ({ ...(await importOriginal<typeof import('./move')>()), moveLocalDrawings }))

const drawing = (n: number) => ({ id: `local-${n}`, name: `Desenho ${n}.excalidraw`, content: '{}' })
const report = (overrides: Partial<MoveReport> = {}): MoveReport => ({ total: 0, moved: 0, failed: 0, failures: [], busy: false, ...overrides })

function setup(count: number, options: Parameters<typeof renderWithProviders>[1] = {}) {
  const local = memoryDrive(Array.from({ length: count }, (_, i) => drawing(i + 1)))
  const drive = memoryDrive()
  renderWithProviders(<MoveOffer />, { drive: drive.client, localDrive: local.client, ...options })
  return { local, drive }
}

beforeEach(() => {
  moveLocalDrawings.mockReset()
  resetMoveOffer()
  sessionStorage.clear()
})

describe('the offer', () => {
  it('asks to move N local drawings, in the plural', async () => {
    setup(3)
    expect(await screen.findByText('Mover seus 3 desenhos locais para o Drive?')).toBeInTheDocument()
    expect(screen.getByText(/copiados para a pasta Rabisco do seu Drive e só depois apagados/)).toBeInTheDocument()
  })

  it('asks in the singular for a single drawing, in both languages', async () => {
    setup(1)
    expect(await screen.findByText('Mover seu desenho local para o Drive?')).toBeInTheDocument()
  })

  it('says it in English', async () => {
    setup(2, { lang: 'en' })
    expect(await screen.findByText('Move your 2 local drawings to Drive?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move to Drive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument()
  })

  it('does not appear without local drawings', async () => {
    setup(0)
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })

  it('does not appear in the local mode', async () => {
    setup(2, { mode: 'local' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mover para o Drive' })).not.toBeInTheDocument())
  })

  it('does not appear when the person is not signed in', async () => {
    setup(2, { auth: signedInAuth({ status: 'signed-out', user: null }) })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mover para o Drive' })).not.toBeInTheDocument())
  })

  it('does not come back after it was answered in this session', async () => {
    sessionStorage.setItem('rabisco.moveOffer', 'done')
    setup(2)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mover para o Drive' })).not.toBeInTheDocument())
  })

  it('"Not now" hides the offer for the session and moves nothing', async () => {
    setup(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Agora não' }))
    expect(screen.queryByRole('button', { name: 'Mover para o Drive' })).not.toBeInTheDocument()
    expect(moveOfferAnswered()).toBe(true)
    expect(moveLocalDrawings).not.toHaveBeenCalled()
  })
})

describe('moving', () => {
  it('moves through the Drive client, shows the progress and then how many were moved', async () => {
    let finish!: (value: MoveReport) => void
    moveLocalDrawings.mockImplementation(
      (_drive: unknown, options: { onProgress(done: number, total: number): void }) =>
        new Promise<MoveReport>((resolve) => {
          options.onProgress(1, 2)
          finish = resolve
        }),
    )
    const { drive } = setup(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    expect(await screen.findByText('Movendo 1 de 2…')).toBeInTheDocument()
    expect(moveLocalDrawings).toHaveBeenCalledWith(drive.client, expect.objectContaining({ ids: undefined }))
    finish(report({ total: 2, moved: 2 }))
    expect(await screen.findByText('Os 2 desenhos foram movidos para o Drive.')).toBeInTheDocument()
    expect(moveOfferAnswered()).toBe(true)
  })

  it('says it in the singular when a single drawing was moved', async () => {
    moveLocalDrawings.mockResolvedValue(report({ total: 1, moved: 1 }))
    setup(1)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    expect(await screen.findByText('Seu desenho foi movido para o Drive.')).toBeInTheDocument()
  })

  it('on a partial failure tells how many moved and failed, and "Try again" only retries the ones that failed', async () => {
    moveLocalDrawings
      .mockResolvedValueOnce(
        report({ total: 3, moved: 1, failed: 2, failures: [{ id: 'local-2', name: 'b', reason: 'error' }, { id: 'local-3', name: 'c', reason: 'error' }] }),
      )
      .mockResolvedValueOnce(report({ total: 2, moved: 1, failed: 1, failures: [{ id: 'local-3', name: 'c', reason: 'error' }] }))
    setup(3)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Movidos: 1. Com falha: 2. Os que falharam continuam salvos neste navegador.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(moveLocalDrawings).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ ids: ['local-2', 'local-3'] }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Movidos: 2. Com falha: 1.')
  })

  it('reports the partial result in English', async () => {
    moveLocalDrawings.mockResolvedValue(report({ total: 2, moved: 1, failed: 1, failures: [{ id: 'local-2', name: 'b', reason: 'error' }] }))
    setup(2, { lang: 'en' })
    await userEvent.click(await screen.findByRole('button', { name: 'Move to Drive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Moved: 1. Failed: 1. The ones that failed are still saved in this browser.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('closing the result hides the offer', async () => {
    moveLocalDrawings.mockResolvedValue(report({ total: 2, moved: 2 }))
    setup(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    const result = await screen.findByText('Os 2 desenhos foram movidos para o Drive.')
    await userEvent.click(within(result.closest('section')!).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByText('Os 2 desenhos foram movidos para o Drive.')).not.toBeInTheDocument()
  })

  it('goes back to the offer when another tab is already moving', async () => {
    moveLocalDrawings.mockResolvedValue(report({ busy: true }))
    setup(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    expect(await screen.findByText('Mover seus 2 desenhos locais para o Drive?')).toBeInTheDocument()
  })

  it('treats a failure to even list the drawings as a failed move that can be retried', async () => {
    moveLocalDrawings.mockRejectedValueOnce(new Error('idb')).mockResolvedValueOnce(report({ total: 2, moved: 2 }))
    setup(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Mover para o Drive' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(moveLocalDrawings).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ ids: undefined }))
    expect(await screen.findByText('Os 2 desenhos foram movidos para o Drive.')).toBeInTheDocument()
  })
})
