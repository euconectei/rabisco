import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n/I18nProvider'
import { MoveResult } from './MoveResult'
import type { MoveState } from './useMoveLocal'

function show(state: Exclude<MoveState, { phase: 'idle' }>, lang: 'pt-BR' | 'en' = 'pt-BR') {
  render(
    <I18nProvider initialLanguage={lang}>
      <MoveResult state={state} onRetry={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>,
  )
}

it('names each drawing that stayed and says why', () => {
  show({
    phase: 'finished',
    moved: 1,
    failed: 2,
    failures: [
      { id: 'local-1', name: 'Plano.excalidraw', reason: 'draft' },
      { id: 'local-2', name: 'Mapa.excalidraw', reason: 'changed' },
    ],
  })
  expect(screen.getByText('Plano')).toBeInTheDocument()
  expect(screen.getByText(/tem alterações não salvas; abra o desenho, restaure ou descarte o rascunho/)).toBeInTheDocument()
  expect(screen.getByText(/foi alterado enquanto movíamos/)).toBeInTheDocument()
})

it('gives a sentence for every other reason too, in English', () => {
  show(
    {
      phase: 'finished',
      moved: 0,
      failed: 3,
      failures: [
        { id: 'a', name: 'A.excalidraw', reason: 'mismatch' },
        { id: 'b', name: 'B.excalidraw', reason: 'damaged' },
        { id: 'c', name: 'C.excalidraw', reason: 'error' },
      ],
    },
    'en',
  )
  expect(screen.getByText(/the copy in Drive did not match/)).toBeInTheDocument()
  expect(screen.getByText(/damaged in this browser/)).toBeInTheDocument()
  expect(screen.getByText(/could not be uploaded right now/)).toBeInTheDocument()
})

it('never says "0 drawings were moved"', () => {
  show({ phase: 'finished', moved: 0, failed: 0, failures: [] })
  expect(screen.getByRole('status')).toHaveTextContent('Nenhum desenho foi movido.')
  expect(screen.queryByText(/Os 0 desenhos/)).not.toBeInTheDocument()
})

it('when nothing moved but some failed, says so instead of "Moved: 0"', () => {
  show({ phase: 'finished', moved: 0, failed: 1, failures: [{ id: 'a', name: 'A.excalidraw', reason: 'error' }] })
  expect(screen.getByRole('alert')).toHaveTextContent('Nenhum desenho foi movido.')
})
