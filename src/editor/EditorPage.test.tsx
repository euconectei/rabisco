import 'vitest-canvas-mock'
import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import fixture from './fixtures/excalidraw-com.excalidraw?raw'
import { AuthContext, type AuthValue } from '../auth/context'
import { DriveContext } from '../drive/context'
import { DriveError } from '../drive/errors'
import { I18nProvider } from '../i18n/I18nProvider'
import { AppRoutes } from '../routes'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { serializeAsJSON } from '@excalidraw/excalidraw'
import { deleteDraft, getDraft, putDraft } from './drafts'

const mounts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@excalidraw/excalidraw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@excalidraw/excalidraw')>()
  type Props = {
    langCode: string
    initialData?: { elements?: Array<{ id: string; text?: string }>; appState?: object }
    onChange?: (elements: unknown[], appState: object, files: object) => void
    renderTopRightUI?: () => ReactNode
    excalidrawAPI?: (api: unknown) => void
    children?: ReactNode
  }
  function Excalidraw({ langCode, initialData, onChange, renderTopRightUI, excalidrawAPI, children }: Props) {
    useEffect(() => {
      mounts.count += 1
      let current = (initialData?.elements ?? []) as unknown[]
      const appState = { ...(initialData?.appState ?? {}), selectedElementIds: {}, editingTextElement: null, scrollX: 0, scrollY: 0, zoom: { value: 1 }, offsetLeft: 0, offsetTop: 0 }
      excalidrawAPI?.({
        getSceneElements: () => current,
        getAppState: () => appState,
        updateScene: (scene: { elements?: unknown[]; appState?: object }) => {
          if (scene.appState) Object.assign(appState, scene.appState)
          if (scene.elements) {
            current = scene.elements
            onChange?.(current, appState, {})
          }
        },
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only, like the real component
    }, [])
    const elements = initialData?.elements ?? []
    // Like the real component, onChange always carries the full appState.
    const appState = initialData?.appState ?? {}
    const edit = (text: string) => {
      const element = { id: `added-${text}`, type: 'text', text, originalText: text, x: 0, y: 0, width: 10, height: 10, isDeleted: false, version: 1, versionNonce: text.length * 7919 }
      onChange?.([...elements, element], appState, {})
    }
    return (
      <div data-testid="excalidraw" data-lang={langCode} data-content={elements.map((e) => e.text ?? e.id).join('|')}>
        {renderTopRightUI?.()}
        <button type="button" onClick={() => edit('Primeira edição')}>simulate edit</button>
        <button type="button" onClick={() => edit('Segunda edição')}>simulate second edit</button>
        <button type="button" onClick={() => onChange?.(elements, { ...appState, scrollX: 99 }, {})}>simulate scroll</button>
        {children}
      </div>
    )
  }
  const MainMenu = ({ children }: { children: ReactNode }) => <nav>{children}</nav>
  MainMenu.Item = ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => (
    <button type="button" onClick={onSelect}>{children}</button>
  )
  MainMenu.Separator = () => <hr />
  MainMenu.DefaultItems = { ToggleTheme: () => null, ChangeCanvasBackground: () => null }
  const Footer = ({ children }: { children: ReactNode }) => <footer>{children}</footer>
  return {
    ...actual,
    serializeAsJSON: vi.fn(actual.serializeAsJSON),
    Excalidraw,
    MainMenu,
    Footer,
    exportToBlob: vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })),
  }
})
vi.mock('@excalidraw/excalidraw/index.css', () => ({}))

function seededDrive() {
  return memoryDrive([{ id: 'f1', name: 'Mapa.excalidraw', content: fixture }])
}

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function open(drive = seededDrive(), options: { lang?: 'pt-BR' | 'en'; route?: string } = {}) {
  renderWithProviders(
    <>
      <AppRoutes />
      <LocationProbe />
    </>,
    { route: options.route ?? '/edit/f1', lang: options.lang ?? 'pt-BR', drive: drive.client },
  )
  return drive
}

// The first lazy load of the editor (and the real Excalidraw module) can take a few seconds.
const canvas = () => screen.findByTestId('excalidraw', {}, { timeout: 10_000 })

vi.setConfig({ testTimeout: 30_000 })

beforeEach(async () => {
  mounts.count = 0
  for (const id of ['f1', 'file-1', 'file-2']) await deleteDraft(id)
})
afterEach(() => vi.useRealTimers())

describe('opening', () => {
  it('loads the file from Drive and hands the scene to Excalidraw', async () => {
    const drive = open()
    expect((await canvas()).dataset.content).toBe('rect-1|Ideia principal')
    expect(drive.client.getMeta).toHaveBeenCalledWith('f1')
    expect(screen.getByRole('textbox', { name: 'Nome do desenho' })).toHaveValue('Mapa')
  })

  it('shows a loading message while the file downloads', async () => {
    const drive = seededDrive()
    drive.client.getMeta.mockImplementation(() => new Promise(() => {}))
    open(drive)
    expect(await screen.findByText('Abrindo o desenho…', {}, { timeout: 10_000 })).toBeInTheDocument()
  })

  it('renders Excalidraw in the current language and switches without remounting', async () => {
    open()
    const element = await canvas()
    expect(element).toHaveAttribute('data-lang', 'pt-BR')
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(element).toHaveAttribute('data-lang', 'en')
    expect(mounts.count).toBe(1)
  })

  it('says when the file does not exist', async () => {
    open(memoryDrive())
    expect(await screen.findByText('Não encontramos este desenho no seu Drive.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meus arquivos' })).toHaveAttribute('href', '/app')
  })

  it('refuses files that are not Excalidraw drawings and never writes to them', async () => {
    const drive = memoryDrive([{ id: 'f1', name: 'notes.excalidraw', content: '{"hello":"world"}' }])
    open(drive)
    expect(await screen.findByText('Este arquivo não é um desenho do Excalidraw.')).toBeInTheDocument()
    expect(drive.client.save).not.toHaveBeenCalled()
  })

  it('goes back to the files page and opens the news from the menu', async () => {
    open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: `Novidades (v${__APP_VERSION__})` }))
    expect(screen.getByRole('heading', { level: 1, name: 'Novidades' })).toBeInTheDocument()
  })
})

describe('review follow-ups', () => {
  it('reads the revision before the content, so a save in between can only cause a safe conflict', async () => {
    const drive = seededDrive()
    let releaseMeta!: () => void
    const realGetMeta = drive.client.getMeta.getMockImplementation()!
    drive.client.getMeta.mockImplementationOnce(async (id: string) => {
      await new Promise<void>((resolve) => (releaseMeta = resolve))
      return realGetMeta(id)
    })
    open(drive)
    await waitFor(() => expect(drive.client.getMeta).toHaveBeenCalled(), { timeout: 10_000 })
    expect(drive.client.download).not.toHaveBeenCalled()
    releaseMeta()
    expect((await canvas()).dataset.content).toBe('rect-1|Ideia principal')
  })

  it('asks to reconnect when the session expired before opening, then opens the file', async () => {
    const drive = seededDrive()
    drive.client.getMeta.mockRejectedValueOnce(new DriveError('auth', 'expired', 401))
    const tree = (auth: AuthValue) => (
      <I18nProvider initialLanguage="pt-BR">
        <AuthContext.Provider value={auth}>
          <DriveContext.Provider value={drive.client}>
            <MemoryRouter initialEntries={['/edit/f1']}>
              <AppRoutes />
            </MemoryRouter>
          </DriveContext.Provider>
        </AuthContext.Provider>
      </I18nProvider>
    )
    const { rerender } = render(tree(signedInAuth()))
    expect(await screen.findByText('Sua sessão com o Google expirou. Reconecte para abrir este desenho.', {}, { timeout: 10_000 })).toBeInTheDocument()
    rerender(tree(signedInAuth({ status: 'needs-reconnect' })))
    rerender(tree(signedInAuth({ status: 'signed-in' })))
    expect((await canvas()).dataset.content).toBe('rect-1|Ideia principal')
  })

  it('also sets returnValue when leaving with unsaved changes (Safari and older browsers)', async () => {
    open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    let assigned: unknown = 'untouched'
    Object.defineProperty(event, 'returnValue', { configurable: true, get: () => assigned, set: (v) => (assigned = v) })
    window.dispatchEvent(event)
    expect(assigned).toBe('')
  })

  it('tells when "Use the Drive version" fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.editExternally('f1', fixture.replace('Ideia principal', 'Editado no tablet'))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    drive.client.download.mockRejectedValueOnce(new DriveError('network', 'offline'))
    await userEvent.click(await screen.findByRole('button', { name: 'Usar a do Drive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não deu certo. Verifique sua conexão e tente de novo.')
  })

  it('puts the old name back in the title when renaming fails', async () => {
    const drive = open()
    await canvas()
    drive.client.rename.mockRejectedValueOnce(new DriveError('server', 'boom', 500))
    const title = screen.getByRole('textbox', { name: 'Nome do desenho' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Plano{Enter}')
    await waitFor(() => expect(title).toHaveValue('Mapa'))
  })
})

describe('mind map', () => {
  it('creates a mind map where the canvas is clicked, and it reaches the save queue', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }))
    expect(screen.getByText('Clique onde o mapa deve começar (Esc cancela)')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByTestId('mindmap-placement'), { clientX: 300, clientY: 200 })
    expect(screen.queryByTestId('mindmap-placement')).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalled())
    const saved = JSON.parse(drive.client.save.mock.calls.at(-1)![1]) as { elements: Array<{ customData?: { rabisco?: { kind: string } }; text?: string }> }
    expect(saved.elements.some((e) => e.customData?.rabisco?.kind === 'node')).toBe(true)
    expect(saved.elements.some((e) => e.text === 'Ideia central')).toBe(true)
  })

  it('Esc cancels placing a map', async () => {
    open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('mindmap-placement')).not.toBeInTheDocument()
  })
})

describe('drafts', () => {
  it('offers to restore unsaved changes, and restoring keeps them pending', async () => {
    const draftJson = fixture.replace('Ideia principal', 'Ideia do rascunho')
    await putDraft({ fileId: 'f1', json: draftJson, baseVersion: '1', updatedAt: Date.now() })
    open()
    expect(await screen.findByRole('dialog', { name: 'Alterações não salvas' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect((await canvas()).dataset.content).toBe('rect-1|Ideia do rascunho')
    expect(screen.getByText('Alterações pendentes')).toBeInTheDocument()
  })

  it('restoring a draft made on an older revision raises a conflict instead of overwriting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const draftJson = fixture.replace('Ideia principal', 'Feito offline no notebook')
    await putDraft({ fileId: 'f1', json: draftJson, baseVersion: 'rev-old', updatedAt: Date.now() })
    const drive = open()
    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar' }))
    await canvas()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByRole('dialog', { name: 'Este desenho mudou em outro lugar' })).toBeInTheDocument()
    expect(drive.client.save).not.toHaveBeenCalled()
  })

  it('restoring a draft made on the current revision saves it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const draftJson = fixture.replace('Ideia principal', 'Feito offline no notebook')
    await putDraft({ fileId: 'f1', json: draftJson, baseVersion: 'rev-1', updatedAt: Date.now() })
    const drive = open()
    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar' }))
    await canvas()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(1))
    expect(drive.files.get('f1')!.content).toContain('Feito offline no notebook')
  })

  it('discarding a draft opens the Drive version and forgets the draft', async () => {
    await putDraft({ fileId: 'f1', json: fixture.replace('Ideia principal', 'Velha'), baseVersion: '1', updatedAt: Date.now() })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    expect((await canvas()).dataset.content).toBe('rect-1|Ideia principal')
    await waitFor(async () => expect(await getDraft('f1')).toBeNull())
  })

  it('does not ask when the draft equals the Drive file', async () => {
    await putDraft({ fileId: 'f1', json: fixture, baseVersion: '1', updatedAt: Date.now() })
    open()
    await canvas()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('saving', () => {
  it('saves to Drive 2 s after an edit, with a thumbnail, and ignores scroll-only changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'simulate scroll' }))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(drive.client.save).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    expect(screen.getByText('Alterações pendentes')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(1))
    const [id, json, thumbnail] = drive.client.save.mock.calls[0]
    expect(id).toBe('f1')
    expect(json).toContain('Primeira edição')
    expect(thumbnail).toEqual({ image: 'AQID', mimeType: 'image/png' })
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
  })

  it('does not re-serialize the scene for changes that never reach the file (pointer, scroll, selection)', async () => {
    open()
    await canvas()
    const before = vi.mocked(serializeAsJSON).mock.calls.length
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'simulate scroll' }))
    expect(vi.mocked(serializeAsJSON).mock.calls.length).toBe(before)
  })

  it('shows the conflict and keeps the local version on request', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.editExternally('f1', fixture.replace('Ideia principal', 'Editado no tablet'))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByRole('dialog', { name: 'Este desenho mudou em outro lugar' })).toBeInTheDocument()
    expect(drive.client.save).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Manter a minha versão' }))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(1))
    expect(drive.files.get('f1')!.content).toContain('Primeira edição')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches to the Drive version on request', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.editExternally('f1', fixture.replace('Ideia principal', 'Editado no tablet'))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await userEvent.click(await screen.findByRole('button', { name: 'Usar a do Drive' }))
    await waitFor(async () => expect((await canvas()).dataset.content).toBe('rect-1|Editado no tablet'))
    expect(drive.client.save).not.toHaveBeenCalled()
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })

  it('offers a retry when saving fails, and saves on retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.client.save.mockRejectedValueOnce(new DriveError('server', 'boom', 503))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByText('Não foi possível salvar.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
  })

  it('offers a retry while offline', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.client.save.mockRejectedValueOnce(new DriveError('network', 'offline'))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
  })

  it('offers to save as a new file when the file disappears from Drive', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.remove('f1')
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByText('Este desenho não está mais acessível no seu Drive.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar como novo arquivo' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/edit/file-1'))
    expect(drive.client.createFile).toHaveBeenCalledWith('Mapa (cópia)', expect.stringContaining('Primeira edição'), 'folder-1')
  })

  it('renames through the title without causing a conflict on the next save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    const title = screen.getByRole('textbox', { name: 'Nome do desenho' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Plano{Enter}')
    await waitFor(() => expect(drive.client.rename).toHaveBeenCalledWith('f1', 'Plano'))
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ignores metadata-only changes on Drive (no false conflict)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.touchMetadata('f1')
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renaming does not hide an edit made elsewhere', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = open()
    await canvas()
    drive.editExternally('f1', fixture.replace('Ideia principal', 'Editado no tablet'))
    const title = screen.getByRole('textbox', { name: 'Nome do desenho' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Plano{Enter}')
    await waitFor(() => expect(drive.client.rename).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByRole('dialog', { name: 'Este desenho mudou em outro lugar' })).toBeInTheDocument()
    expect(drive.client.save).not.toHaveBeenCalled()
  })

  it('asks the browser to confirm leaving only while there are unsaved changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    open()
    await canvas()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })

  it('waits for a reconnect after the session expires, then saves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const drive = seededDrive()
    drive.client.save.mockRejectedValueOnce(new DriveError('auth', 'expired', 401))
    const tree = (auth: AuthValue) => (
      <I18nProvider initialLanguage="pt-BR">
        <AuthContext.Provider value={auth}>
          <DriveContext.Provider value={drive.client}>
            <MemoryRouter initialEntries={['/edit/f1']}>
              <AppRoutes />
            </MemoryRouter>
          </DriveContext.Provider>
        </AuthContext.Provider>
      </I18nProvider>
    )
    const { rerender } = render(tree(signedInAuth()))
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'simulate edit' }))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await screen.findByText('Sessão expirada — reconecte para salvar.')).toBeInTheDocument()
    rerender(tree(signedInAuth({ status: 'needs-reconnect' })))
    rerender(tree(signedInAuth({ status: 'signed-in' })))
    await waitFor(() => expect(drive.client.save).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
  })
})

describe('new drawings', () => {
  it('creates an untitled file in the Rabisco folder and opens it', async () => {
    const drive = open(memoryDrive(), { route: '/edit/new' })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/edit/file-1'))
    expect(drive.client.createFile).toHaveBeenCalledWith('Sem título', expect.stringContaining('"type": "excalidraw"'), 'folder-1')
    expect(await canvas()).toBeInTheDocument()
  })

  it('names new files in the current language', async () => {
    const drive = open(memoryDrive(), { route: '/edit/new', lang: 'en' })
    await waitFor(() => expect(drive.client.createFile).toHaveBeenCalledWith('Untitled', expect.any(String), 'folder-1'))
  })

  it('explains when the file cannot be created', async () => {
    const drive = memoryDrive()
    drive.client.ensureFolder.mockRejectedValueOnce(new DriveError('network', 'offline'))
    open(drive, { route: '/edit/new' })
    expect(await screen.findByText('Não foi possível criar o desenho.')).toBeInTheDocument()
  })
})
