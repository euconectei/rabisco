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
const convertMermaid = vi.hoisted(() => vi.fn())
vi.mock('../mermaid/convert', async (importOriginal) => ({ ...(await importOriginal<typeof import('../mermaid/convert')>()), convertMermaid }))
vi.mock('@excalidraw/excalidraw', () => {
  throw new Error('module load failed')
})

function Where() {
  const location = useLocation()
  return (
    <>
      <p data-testid="where">{location.pathname}</p>
      <p data-testid="state">{JSON.stringify(location.state)}</p>
    </>
  )
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

beforeEach(() => {
  pick.mockReset()
  convertMermaid.mockReset()
  sessionStorage.clear()
})

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
  await waitFor(() => expect(auth.signOut).toHaveBeenCalled())
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

describe('importing', () => {
  it('has "Import Mermaid" in the action bar', async () => {
    setup(oneFile())
    expect(await screen.findByRole('button', { name: 'Importar Mermaid' })).toBeInTheDocument()
  })

  it('has "Import Mermaid" in the empty state too', async () => {
    setup()
    await screen.findByRole('heading', { level: 1, name: 'Seu primeiro rabisco começa aqui' })
    expect(screen.getByRole('button', { name: 'Importar Mermaid' })).toBeInTheDocument()
  })

  it('opens the Mermaid dialog and goes to the new-drawing route with the converted scene', async () => {
    convertMermaid.mockResolvedValue({ elements: [{ id: 'a', type: 'rectangle' }], files: {} })
    setup(oneFile())
    await userEvent.click(await screen.findByRole('button', { name: 'Importar Mermaid' }))
    const dialog = screen.getByRole('dialog', { name: 'Importar Mermaid' })
    await userEvent.type(within(dialog).getByLabelText('Código Mermaid'), 'flowchart TD')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar desenho' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/edit/new'))
    const { importScene } = JSON.parse(screen.getByTestId('state').textContent!)
    expect(importScene.name).toBe('Sem título')
    expect(JSON.parse(importScene.json).elements).toEqual([{ id: 'a', type: 'rectangle' }])
  })

  it('closes the dialog without going anywhere on Cancel', async () => {
    setup(oneFile())
    await userEvent.click(await screen.findByRole('button', { name: 'Importar Mermaid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/app')
  })

  it('says what Import accepts next to the drawings, and explains it in the button title', async () => {
    setup(oneFile())
    expect(await screen.findByText(/Importar aceita Markdown e PNG ou SVG exportados do Rabisco/)).toBeInTheDocument()
    expect(screen.getByLabelText('Importar').closest('label')).toHaveAttribute('title', expect.stringContaining('Markdown'))
  })

  it('says it in the empty state too, in English', async () => {
    setup(memoryDrive(), signedInAuth(), 'en')
    await screen.findByRole('heading', { level: 1, name: 'Your first scribble starts here' })
    expect(screen.getByText(/Import accepts Markdown/)).toBeInTheDocument()
    expect(screen.getByLabelText('Import').closest('label')).toHaveAttribute('title', expect.stringContaining('Markdown'))
  })
})

describe('without an account (drawings kept in this browser)', () => {
  function setupLocal(files: Array<{ id: string; name: string; content: string }> = [], lang: 'pt-BR' | 'en' = 'pt-BR') {
    const local = memoryDrive(files)
    renderWithProviders(<FilesPage />, {
      route: '/app',
      mode: 'local',
      localDrive: local.client,
      auth: signedInAuth({ status: 'signed-out', user: null, hint: null }),
      lang,
    })
    return local
  }

  it('shows the notice with a way to sign in, and never offers the Drive Picker', async () => {
    setupLocal([{ id: 'local-1', name: 'Plano.excalidraw', content: '{}' }])
    await screen.findByRole('list', { name: 'Seus desenhos' })
    expect(screen.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toHaveTextContent('Seus desenhos ficam só neste navegador.')
    expect(screen.getAllByRole('button', { name: 'Entrar' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: 'Abrir do Drive' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar Mermaid' })).toBeInTheDocument()
  })

  it('counts a single drawing as kept in this browser', async () => {
    setupLocal([{ id: 'local-1', name: 'A.excalidraw', content: '{}' }])
    expect(await screen.findByText('1 desenho neste navegador')).toBeInTheDocument()
  })

  it('counts several drawings as kept in this browser, in English', async () => {
    setupLocal(
      [
        { id: 'local-1', name: 'A.excalidraw', content: '{}' },
        { id: 'local-2', name: 'B.excalidraw', content: '{}' },
      ],
      'en',
    )
    expect(await screen.findByText('2 drawings in this browser')).toBeInTheDocument()
  })

  it('has an empty state that talks about this browser and does not mention the Drive', async () => {
    setupLocal()
    expect(await screen.findByText(/Os desenhos ficam só neste navegador\. Crie um do zero/)).toBeInTheDocument()
    expect(screen.queryByText('Já tem desenhos no Drive?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir do Drive' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar Mermaid' })).toBeInTheDocument()
  })

  it('shows a clear message, and a retry, when this browser storage cannot be opened', async () => {
    const local = memoryDrive()
    local.client.listFiles.mockRejectedValueOnce(new DriveError('unknown', 'blocked'))
    renderWithProviders(<FilesPage />, { route: '/app', mode: 'local', localDrive: local.client })
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir o armazenamento deste navegador')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Seu primeiro rabisco começa aqui' })).toBeInTheDocument()
  })

  it('shows a saved thumbnail as it is, not as a Drive link', async () => {
    const local = memoryDrive()
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    local.client.listFiles.mockResolvedValue([{ id: 'local-1', name: 'A.excalidraw', version: '1', modifiedTime: new Date().toISOString(), thumbnailLink: dataUrl }])
    renderWithProviders(<FilesPage />, { route: '/app', mode: 'local', localDrive: local.client })
    const list = await screen.findByRole('list', { name: 'Seus desenhos' })
    expect(list.querySelector('img')).toHaveAttribute('src', dataUrl)
  })
})

describe('signed in, with drawings still in this browser', () => {
  const withLocal = () => memoryDrive([{ id: 'local-1', name: 'Velho.excalidraw', content: '{}' }])

  it('shows a quiet "Local drawings" link while there are any, and no notice', async () => {
    const local = withLocal()
    renderWithProviders(<FilesPage />, { route: '/app', drive: oneFile().client, localDrive: local.client })
    sessionStorage.setItem('rabisco.moveOffer', 'done')
    expect(await screen.findByRole('link', { name: 'Desenhos locais' })).toHaveAttribute('href', '/local')
    expect(screen.queryByRole('complementary', { name: 'Aviso sobre o modo local' })).not.toBeInTheDocument()
  })

  it('has no such link when nothing is kept in this browser', async () => {
    setup(oneFile())
    await screen.findByRole('list', { name: 'Seus desenhos' })
    expect(screen.queryByRole('link', { name: 'Desenhos locais' })).not.toBeInTheDocument()
  })
})
