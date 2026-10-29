import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { ErrorScreen, LoadingScreen } from './LoadingScreen'

// Each test starts "long after" the last one: a screen seen a moment ago makes the next one show at once.
let day = 0
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2030, 0, ++day))
})
afterEach(() => vi.useRealTimers())

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('LoadingScreen', () => {
  it('shows nothing for the first moments, so a fast load does not flash', () => {
    renderWithProviders(<LoadingScreen title="Abrindo o desenho…" />)
    advance(150)
    expect(screen.queryByText('Abrindo o desenho…')).not.toBeInTheDocument()
    advance(100)
    expect(screen.getByText('Abrindo o desenho…')).toBeInTheDocument()
  })

  it('is announced as a status, with the detail under the title and a decorative picture', () => {
    renderWithProviders(<LoadingScreen title="Abrindo o desenho…" detail="Mapa da aula" />)
    advance(250)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Abrindo o desenho…')
    expect(status).toHaveTextContent('Mapa da aula')
    expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows at once when another loading screen was on display a moment ago (one flow, no blank in between)', () => {
    const first = renderWithProviders(<LoadingScreen title="Carregando o editor…" />)
    advance(250)
    expect(screen.getByText('Carregando o editor…')).toBeInTheDocument()
    first.unmount()
    advance(100)

    renderWithProviders(<LoadingScreen title="Criando um desenho novo…" />)
    expect(screen.getByText('Criando um desenho novo…')).toBeInTheDocument()
  })

  it('waits again once the last screen is old news', () => {
    const first = renderWithProviders(<LoadingScreen title="Carregando o editor…" />)
    advance(250)
    first.unmount()
    advance(5000)

    renderWithProviders(<LoadingScreen title="Criando um desenho novo…" />)
    expect(screen.queryByText('Criando um desenho novo…')).not.toBeInTheDocument()
  })

  it('says it is taking longer after a while, with a way back to the files', () => {
    renderWithProviders(<LoadingScreen title="Abrindo o desenho…" />, { route: '/edit/abc' })
    advance(7000)
    expect(screen.queryByText('Está demorando mais que o normal…')).not.toBeInTheDocument()
    advance(1500)
    expect(screen.getByText('Está demorando mais que o normal…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meus arquivos' })).toHaveAttribute('href', '/app')
  })

  it('does not offer a way back on screens that are not part of the app flow', () => {
    renderWithProviders(<LoadingScreen title="Carregando…" back={false} />)
    advance(9000)
    expect(screen.getByText('Está demorando mais que o normal…')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Meus arquivos' })).not.toBeInTheDocument()
  })

  it('can show a picture next to the title (a template being turned into a drawing)', () => {
    renderWithProviders(<LoadingScreen title="Criando um desenho novo…" image="/templates/celula.pt-BR.webp" />)
    advance(250)
    const image = screen.getByRole('status').querySelector('img')
    expect(image).toHaveAttribute('src', '/templates/celula.pt-BR.webp')
    expect(image).toHaveAttribute('alt', '')
  })
})

describe('ErrorScreen', () => {
  it('is announced at once, with the actions given to it', () => {
    renderWithProviders(
      <ErrorScreen title="Não foi possível criar o desenho.">
        <button type="button">Tentar de novo</button>
      </ErrorScreen>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível criar o desenho.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
