import 'vitest-canvas-mock'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders } from '../test/renderWithProviders'
import { downloadBlob } from '../editor/download'
import { ExportImageDialog } from './ExportImageDialog'
import { DEFAULT_EXPORT_OPTIONS } from './exportOptions'
import { renderImage } from './imageExport'

vi.mock('./imageExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./imageExport')>()),
  renderImage: vi.fn(async (_scene: unknown, _selected: unknown, options: { format: string }) =>
    options.format === 'svg'
      ? { blob: new Blob(['<svg/>'], { type: 'image/svg+xml' }), mimeType: 'image/svg+xml' }
      : { blob: new Blob(['png'], { type: 'image/png' }), mimeType: 'image/png' },
  ),
}))
vi.mock('../editor/download', () => ({ downloadBlob: vi.fn() }))

const ELEMENTS = [{ id: 'a', isDeleted: false }]

function fakeApi(selected: Record<string, true> = {}) {
  return {
    getSceneElements: () => ELEMENTS,
    getAppState: () => ({ selectedElementIds: selected, viewBackgroundColor: '#fff' }),
    getFiles: () => ({}),
  } as unknown as ExcalidrawImperativeAPI
}

function open({ selected = {}, baseName = 'Mapa', drive = memoryDrive([{ id: 'f1', name: 'Mapa.excalidraw', content: '{}' }]) } = {}) {
  const onClose = vi.fn()
  renderWithProviders(<ExportImageDialog api={fakeApi(selected)} baseName={baseName} fileId="f1" onClose={onClose} />, { drive: drive.client })
  return { drive, onClose }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

it('offers the whole drawing or the selection, with the selection off when nothing is selected', () => {
  open()
  expect(screen.getByRole('dialog', { name: 'Exportar imagem' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Desenho inteiro' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Só a seleção' })).toBeDisabled()
})

it('can export just the selection when something is selected', async () => {
  open({ selected: { a: true } })
  await userEvent.click(screen.getByRole('radio', { name: 'Só a seleção' }))
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(vi.mocked(renderImage).mock.calls[0][1]).toEqual({ a: true })
  expect(vi.mocked(renderImage).mock.calls[0][2]).toMatchObject({ scope: 'selection' })
})

it('downloads the image named after the drawing, with the chosen options', async () => {
  open()
  await userEvent.click(screen.getByRole('radio', { name: 'SVG' }))
  await userEvent.click(screen.getByRole('radio', { name: '3×' }))
  await userEvent.click(screen.getByRole('checkbox', { name: 'Incluir dados editáveis' }))
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(renderImage).toHaveBeenCalledWith(
    expect.objectContaining({ elements: ELEMENTS }),
    {},
    { ...DEFAULT_EXPORT_OPTIONS, format: 'svg', scale: 3, embedScene: true },
  )
  expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Mapa.svg')
})

it('names an unnamed drawing after the default title', async () => {
  open({ baseName: '' })
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Sem título.png')
})

it('saves the image next to the drawing in Drive and says under which name', async () => {
  const drive = memoryDrive([
    { id: 'f1', name: 'Mapa.excalidraw', content: '{}' },
    { id: 'old', name: 'Mapa.png', content: '' },
  ])
  open({ drive })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar no Drive' }))
  expect(drive.client.createSibling).toHaveBeenCalledWith('Mapa.png', expect.any(Blob), 'image/png', 'f1')
  expect(await screen.findByText('Salvo no Drive como Mapa (2).png.')).toBeInTheDocument()
})

it('keeps the dialog open with an error when saving fails, and downloading still works', async () => {
  const { drive, onClose } = open()
  drive.client.createSibling.mockRejectedValueOnce(new Error('offline'))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar no Drive' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não deu certo. Verifique sua conexão e tente de novo.')
  expect(onClose).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(downloadBlob).toHaveBeenCalledTimes(1)
})

it('disables saving while the upload is in progress', async () => {
  const { drive } = open()
  let finish!: () => void
  drive.client.createSibling.mockImplementationOnce(
    () => new Promise((resolve) => (finish = () => resolve({ id: 'x', name: 'Mapa.png', version: '1', modifiedTime: '' }))),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Salvar no Drive' }))
  expect(screen.getByRole('button', { name: 'Salvando no Drive…' })).toBeDisabled()
  finish()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar no Drive' })).toBeEnabled())
})

it('remembers the options for the next export', async () => {
  open()
  await userEvent.click(screen.getByRole('radio', { name: 'SVG' }))
  await userEvent.click(screen.getByRole('checkbox', { name: 'Com fundo' }))
  document.body.innerHTML = ''
  open()
  expect(screen.getByRole('radio', { name: 'SVG' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Com fundo' })).not.toBeChecked()
})

it('falls back to the whole drawing when the remembered scope is the selection but nothing is selected', async () => {
  open({ selected: { a: true } })
  await userEvent.click(screen.getByRole('radio', { name: 'Só a seleção' }))
  document.body.innerHTML = ''
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(vi.mocked(renderImage).mock.calls.at(-1)![2]).toMatchObject({ scope: 'scene' })
})

it('closes with the button and with Escape', async () => {
  const { onClose } = open()
  await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('says the image could not be made when rendering fails, for both download and Drive', async () => {
  const { drive } = open()
  const tooBig = new Error('Canvas exceeds max size')
  vi.mocked(renderImage).mockRejectedValueOnce(tooBig).mockRejectedValueOnce(tooBig)
  await userEvent.click(screen.getByRole('button', { name: 'Baixar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gerar a imagem. Tente um tamanho menor.')
  expect(downloadBlob).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar no Drive' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gerar a imagem. Tente um tamanho menor.')
  expect(drive.client.createSibling).not.toHaveBeenCalled()
})
