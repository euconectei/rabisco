import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { NotFoundPage } from './NotFoundPage'

it('marks the page noindex while shown and restores robots on unmount', () => {
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'index, follow'
  document.head.appendChild(robots)

  const { unmount } = renderWithProviders(<NotFoundPage />)
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  expect(robots.content).toBe('noindex')

  unmount()
  expect(robots.content).toBe('index, follow')
  robots.remove()
})
