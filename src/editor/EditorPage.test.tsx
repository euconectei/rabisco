import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'
import { AppRoutes } from '../routes'
import { renderWithProviders } from '../test/renderWithProviders'

const mounts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@excalidraw/excalidraw', () => {
  function Excalidraw({ langCode, children }: { langCode: string; children: ReactNode }) {
    useEffect(() => {
      mounts.count += 1
    }, [])
    return (
      <div data-testid="excalidraw" data-lang={langCode}>
        {children}
      </div>
    )
  }
  const MainMenu = ({ children }: { children: ReactNode }) => <nav>{children}</nav>
  MainMenu.Item = ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  )
  MainMenu.Separator = () => <hr />
  MainMenu.DefaultItems = { ToggleTheme: () => null, ChangeCanvasBackground: () => null }
  return { Excalidraw, MainMenu }
})
vi.mock('@excalidraw/excalidraw/index.css', () => ({}))

beforeEach(() => {
  mounts.count = 0
})

it('renders Excalidraw in the current language', async () => {
  renderWithProviders(<AppRoutes />, { route: '/edit/new', lang: 'pt-BR' })
  expect(await screen.findByTestId('excalidraw')).toHaveAttribute('data-lang', 'pt-BR')
})

it('switches language without remounting the canvas', async () => {
  renderWithProviders(<AppRoutes />, { route: '/edit/new', lang: 'pt-BR' })
  const canvas = await screen.findByTestId('excalidraw')
  await userEvent.click(screen.getByRole('button', { name: 'English' }))
  expect(canvas).toHaveAttribute('data-lang', 'en')
  expect(screen.getByRole('button', { name: 'Português' })).toBeInTheDocument()
  expect(mounts.count).toBe(1)
})

it('goes back to the files page from the menu', async () => {
  renderWithProviders(<AppRoutes />, { route: '/edit/new', lang: 'pt-BR' })
  await userEvent.click(await screen.findByRole('button', { name: 'Meus arquivos' }))
  expect(screen.getByRole('heading', { name: 'Meus arquivos' })).toBeInTheDocument()
})
