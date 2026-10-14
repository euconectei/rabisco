import 'vitest-canvas-mock'
import 'fake-indexeddb/auto'
import { getDraft, putDraft } from '../editor/drafts'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { FilesPage } from './FilesPage'
import { DriveError } from '../drive/errors'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'

const pick = vi.hoisted(() => vi.fn())
vi.mock('../drive/usePicker', () => ({ useFilePicker: () => pick }))
// Reading an image loads Excalidraw on demand; here that load fails (e.g. offline), the way a file
// read can fail. No other test in this file opens an image.
vi.mock('@excalidraw/excalidraw', () => {
  throw new Error('module load failed')
})

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

const oneFile = () => memoryDrive([{ id: 'a', name: 'Plano.excalidraw', content: '{}' }])

it('shows the empty state, with a way to create, import or open from the Drive', async () => {
  setup()
  expect(await screen.findByRole('heading', { level: 1, name: 'Seu primeiro rabisco começa aqui' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Criar o primeiro desenho' })).toBeInTheDocument()
  expect(screen.getByLabelText('Importar')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Abrir do Drive' })).toBeInTheDocument()
  expect(screen.getByRole('complementary', { name: 'Anúncio' })).toBeInTheDocument()
})

it('counts the drawings and says so in the singular', async () => {
  setup(oneFile())
  expect(await screen.findByText('1 desenho no seu Google Drive')).toBeInTheDocument()
})

it('counts several drawings', async () => {
  setup(
    memoryDrive([
      { id: 'a', name: 'A.excalidraw', content: '{}' },
      { id: 'b', name: 'B.excalidraw', content: '{}' },
    ]),
  )
  expect(await screen.findByText('2 desenhos no seu Google Drive')).toBeInTheDocument()
})

it('filters by name, ignoring case and accents, and says when nothing matches', async () => {
  setup(
    memoryDrive([
      { id: 'a', name: 'Ação do projeto.excalidraw', content: '{}' },
      { id: 'b', name: 'Viagem.excalidraw', content: '{}' },
    ]),
  )
  const search = await screen.findByRole('searchbox', { name: 'Buscar por nome' })
  await userEvent.type(search, 'ACAO')
  const list = screen.getByRole('list', { name: 'Seus desenhos' })
  expect(within(list).getAllByRole('link')).toHaveLength(1)
  expect(within(list).getByRole('link')).toHaveTextContent('Ação do projeto')
  await userEvent.clear(search)
  await userEvent.type(search, 'zzz')
  expect(screen.queryByRole('list', { name: 'Seus desenhos' })).not.toBeInTheDocument()
  expect(screen.getByText('Nenhum desenho com esse nome.')).toBeInTheDocument()
})

it('shows the Drive thumbnail, sharper, and falls back to the drawing when it fails to load', async () => {
  const drive = memoryDrive([{ id: 'a', name: 'Plano.excalidraw', content: '{}' }])
  drive.client.listFiles.mockResolvedValue([
    { id: 'a', name: 'Plano.excalidraw', version: '1', modifiedTime: new Date().toISOString(), thumbnailLink: 'https://lh3.example/thumb=s220' },
  ])
  setup(drive)
  const list = await screen.findByRole('list', { name: 'Seus desenhos' })
  const image = list.querySelector('img')!
  expect(image).toHaveAttribute('src', 'https://lh3.example/thumb=s480')
  fireEvent.error(image)
  expect(list.querySelector('img')).toBeNull()
  expect(list.querySelector('svg')).not.toBeNull()
})

it('draws a placeholder when the file has no thumbnail', async () => {
  setup(oneFile())
  const list = await screen.findByRole('list', { name: 'Seus desenhos' })
  expect(list.querySelector('img')).toBeNull()
  expect(list.querySelector('svg')).not.toBeNull()
})

it('shows an error with a retry that reloads the list', async () => {
  const drive = memoryDrive([{ id: 'a', name: 'A.excalidraw', content: '{}' }])
  drive.client.listFiles.mockRejectedValueOnce(new DriveError('server', 'boom', 503))
  setup(drive)
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
  expect(within(await screen.findByRole('list', { name: 'Seus desenhos' })).getByRole('link', { name: /^A/ })).toBeInTheDocument()
})

it('"New drawing" opens the new-drawing route', async () => {
  setup(oneFile())
  await userEvent.click(await screen.findByRole('button', { name: 'Novo desenho' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/new')
})

it('"Create the first drawing" opens the new-drawing route from the empty state', async () => {
  setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Criar o primeiro desenho' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/new')
})

it('opens a file chosen in the Drive Picker, and stays on cancel', async () => {
  pick.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'picked', name: 'X.excalidraw' })
  setup(oneFile())
  const button = await screen.findByRole('button', { name: 'Abrir do Drive' })
  await userEvent.click(button)
  expect(screen.getByTestId('where')).toHaveTextContent('/app')
  await userEvent.click(button)
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/edit/picked'))
})

it('shows the account and signs out, forgetting local drafts', async () => {
  await putDraft({ fileId: 'd1', json: '{}', baseVersion: 'r', updatedAt: 1 })
  const { auth } = setup()
  await userEvent.click(await screen.findByRole('button', { name: 'Conta: Ana Souza' }))
  expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
  expect(auth.signOut).toHaveBeenCalled()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'))
  await expect(getDraft('d1')).resolves.toBeNull()
})

it('works in English', async () => {
  setup(memoryDrive([{ id: 'a', name: 'Plan.excalidraw', content: '{}' }]), signedInAuth(), 'en')
  expect(await screen.findByRole('list', { name: 'Your drawings' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open from Drive' })).toBeInTheDocument()
  expect(screen.getByText(/^edited /)).toBeInTheDocument()
})

it('shows an alert and stays put when a markdown file cannot be read', async () => {
  setup(oneFile())
  await screen.findByRole('list', { name: 'Seus desenhos' })
  const input = screen.getByLabelText('Importar') as HTMLInputElement
  const file = new File(['# mapa'], 'mapa.md', { type: 'text/markdown' })
  Object.defineProperty(file, 'text', { value: () => Promise.reject(new Error('read failed')), configurable: true })
  await userEvent.upload(input, file)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler o arquivo. Tente de novo.')
  expect(screen.getByTestId('where')).toHaveTextContent('/app')
})

it('shows an alert and stays put when an image cannot be read', async () => {
  setup(oneFile())
  await screen.findByRole('list', { name: 'Seus desenhos' })
  const input = screen.getByLabelText('Importar') as HTMLInputElement
  const file = new File(['not an image'], 'mapa.png', { type: 'image/png' })
  await userEvent.upload(input, file)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler o arquivo. Tente de novo.')
  expect(screen.getByTestId('where')).toHaveTextContent('/app')
})

it('shows the labeled ad after the file list', async () => {
  renderWithProviders(<FilesPage />, { route: '/app', drive: oneFile().client })
  const ad = await screen.findByRole('complementary', { name: 'Anúncio' })
  expect(await within(ad).findByRole('link', { name: /GitHub/ })).toBeInTheDocument()
})
