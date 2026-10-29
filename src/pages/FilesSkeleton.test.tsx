import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { FilesSkeleton } from './FilesSkeleton'

it('holds the places of the cards while the list loads, and says so to a screen reader', () => {
  const { container } = renderWithProviders(<FilesSkeleton />)
  expect(screen.getByRole('status')).toHaveTextContent('Carregando seus arquivos…')
  expect(container.querySelectorAll('.file-card-skeleton')).toHaveLength(6)
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('says so in English too', () => {
  renderWithProviders(<FilesSkeleton />, { lang: 'en' })
  expect(screen.getByRole('status')).toHaveTextContent('Loading your files…')
})
