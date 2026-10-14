import 'vitest-canvas-mock'
import 'fake-indexeddb/auto'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppRoutes } from '../routes'
import { memoryDrive } from '../test/memoryDrive'
import { renderWithProviders } from '../test/renderWithProviders'
import fixture from './fixtures/excalidraw-com.excalidraw?raw'

const scene = vi.hoisted(() => ({ api: null as null | { updateScene: (arg: { elements?: unknown[] }) => void; getSceneElementsIncludingDeleted: () => unknown[] }, updates: [] as unknown[] }))
const parse = vi.fn()

vi.mock('@excalidraw/mermaid-to-excalidraw', () => ({ parseMermaidToExcalidraw: (...args: unknown[]) => parse(...args) }))
vi.mock('@excalidraw/excalidraw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@excalidraw/excalidraw')>()
  function Excalidraw({ initialData, excalidrawAPI, children }: { initialData?: { elements?: unknown[] }; excalidrawAPI?: (api: unknown) => void; children?: ReactNode }) {
    useEffect(() => {
      let current = (initialData?.elements ?? []) as unknown[]
      const api = {
        getSceneElements: () => current,
        getSceneElementsIncludingDeleted: () => current,
        getAppState: () => ({ selectedElementIds: {}, scrollX: 0, scrollY: 0, zoom: { value: 1 }, offsetLeft: 0, offsetTop: 0 }),
        getFiles: () => ({}),
        updateScene: (arg: { elements?: unknown[] }) => {
          scene.updates.push(arg)
          if (arg.elements) current = arg.elements
        },
      }
      scene.api = api
      excalidrawAPI?.(api)
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only, like the real component
    }, [])
    return <div data-testid="excalidraw">{children}</div>
  }
  const MainMenu = ({ children }: { children: ReactNode }) => <nav>{children}</nav>
  MainMenu.Item = ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  )
  MainMenu.Separator = () => <hr />
  MainMenu.DefaultItems = { ToggleTheme: () => null, ChangeCanvasBackground: () => null }
  return { ...actual, Excalidraw, MainMenu, Footer: ({ children }: { children: ReactNode }) => <footer>{children}</footer>, convertToExcalidrawElements: (items: unknown[]) => items }
})
vi.mock('@excalidraw/excalidraw/index.css', () => ({}))

vi.setConfig({ testTimeout: 30_000 })

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function open(drive = memoryDrive([{ id: 'f1', name: 'Mapa.excalidraw', content: fixture }]), route = '/edit/f1', extra: Parameters<typeof renderWithProviders>[1] = {}) {
  renderWithProviders(
    <>
      <AppRoutes />
      <Where />
    </>,
    { route, drive: drive.client, ...extra },
  )
  return drive
}

const canvas = () => screen.findByTestId('excalidraw', {}, { timeout: 10_000 })
const textbox = () => screen.getByRole('textbox', { name: 'Código Mermaid' })

beforeEach(() => {
  scene.updates = []
  parse.mockReset()
  parse.mockResolvedValue({ elements: [{ type: 'rectangle', id: 'A', x: 0, y: 0, width: 100, height: 50 }, { type: 'diamond', id: 'B', x: 0, y: 100, width: 100, height: 100 }] })
})

describe('Insert Mermaid', () => {
  it('appends the diagram centred in the view, leaving the existing elements as they were', async () => {
    open()
    await canvas()
    const before = JSON.stringify(scene.api!.getSceneElementsIncludingDeleted())
    const beforeCount = scene.api!.getSceneElementsIncludingDeleted().length
    await userEvent.click(screen.getByRole('button', { name: 'Inserir Mermaid…' }))
    expect(screen.getByRole('dialog', { name: 'Inserir Mermaid' })).toBeInTheDocument()
    fireEvent.change(textbox(), { target: { value: 'flowchart TD\nA-->B' } })
    await userEvent.click(screen.getByRole('button', { name: 'Inserir no desenho' }))
    await waitFor(() => expect(scene.updates).toHaveLength(1))
    const after = scene.api!.getSceneElementsIncludingDeleted() as Array<{ id: string; x: number; y: number }>
    expect(after).toHaveLength(beforeCount + 2)
    expect(JSON.stringify(after.slice(0, beforeCount))).toBe(before)
    const center = after.slice(beforeCount)
    expect(center[0].x + 50).toBeCloseTo(window.innerWidth / 2)
    expect(center[0].y + 100).toBeCloseTo(window.innerHeight / 2)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the error in the dialog and leaves the drawing alone when the diagram is invalid', async () => {
    parse.mockRejectedValue(new Error('Parse error'))
    open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'Inserir Mermaid…' }))
    fireEvent.change(textbox(), { target: { value: 'flowchart TD\nA--' } })
    await userEvent.click(screen.getByRole('button', { name: 'Inserir no desenho' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O Mermaid não entendeu')
    expect(scene.updates).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Esc closes the dialog without changing the drawing', async () => {
    open()
    await canvas()
    await userEvent.click(screen.getByRole('button', { name: 'Inserir Mermaid…' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(scene.updates).toHaveLength(0)
  })

  it('has no "Mermaid to Excalidraw" item in the main menu', async () => {
    open()
    await canvas()
    expect(screen.queryByRole('button', { name: /Mermaid to Excalidraw/i })).not.toBeInTheDocument()
  })
})

describe('local drawings', () => {
  it('shows the local notice and hides saving the Markdown to the Drive', async () => {
    const drive = memoryDrive([{ id: 'local-1', name: 'Local.excalidraw', content: fixture }])
    open(drive, '/edit/local-1')
    await canvas()
    expect(screen.getByLabelText('Aviso sobre o modo local')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Salvar .*Drive/i })).not.toBeInTheDocument()
  })

  it('shows neither for a Drive drawing, and keeps the Markdown item', async () => {
    open()
    await canvas()
    expect(screen.queryByLabelText('Aviso sobre o modo local')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar .*Drive/i })).toBeInTheDocument()
  })

  it('opens the Drive copy of a local drawing that was moved', async () => {
    const drive = memoryDrive()
    const localDrive = { ...memoryDrive().client, movedTo: vi.fn(async () => 'drive-9') } as never
    open(drive, '/edit/local-gone', { localDrive })
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/edit/drive-9'), { timeout: 10_000 })
  })
})
