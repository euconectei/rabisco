import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import type { SaveStatus as Status } from './saveQueue'
import { SaveStatus } from './SaveStatus'

function show(status: Status, lost = false) {
  const onRetry = vi.fn()
  const onSaveAsNew = vi.fn()
  renderWithProviders(<SaveStatus status={status} lost={lost} onRetry={onRetry} onSaveAsNew={onSaveAsNew} />)
  return { onRetry, onSaveAsNew }
}

it.each([
  ['saved', 'Salvo'],
  ['saving', 'Salvando…'],
  ['pending', 'Alterações pendentes'],
] as const)('%s is an icon with the words as tooltip and for screen readers', (status, text) => {
  show(status)
  const region = screen.getByRole('status')
  expect(region).toHaveTextContent(text)
  expect(region).toHaveAttribute('title', text)
  expect(region.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('offline keeps the words and a manual retry', async () => {
  const { onRetry } = show('offline')
  expect(screen.getByRole('status')).toHaveTextContent('Sem conexão — salvaremos quando ela voltar.')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

it('keeps the words and a retry for a failed save', async () => {
  const { onRetry } = show('error')
  expect(screen.getByRole('status')).toHaveTextContent('Não foi possível salvar.')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

it('offers to save a copy when the file is gone from the Drive', async () => {
  const { onSaveAsNew } = show('error', true)
  expect(screen.getByRole('status')).toHaveTextContent('Este desenho não está mais acessível')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar como novo arquivo' }))
  expect(onSaveAsNew).toHaveBeenCalledTimes(1)
})

it.each([
  ['conflict', 'Escolha qual versão manter.'],
  ['needs-auth', 'Sessão expirada — reconecte para salvar.'],
] as const)('%s keeps the words', (status, text) => {
  show(status)
  expect(screen.getByRole('status')).toHaveTextContent(text)
})
