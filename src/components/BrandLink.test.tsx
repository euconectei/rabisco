import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { BrandLink } from './BrandLink'

it('is a link to the home page with the logo and the name', () => {
  renderWithProviders(<BrandLink className="brand" size={30} />, { route: '/app' })
  const link = screen.getByRole('link', { name: 'Rabisco' })
  expect(link).toHaveAttribute('href', '/')
  expect(link).toHaveAttribute('title', 'Ir para a página inicial')
  expect(link.querySelector('img')).toHaveAttribute('src', '/favicon.svg')
  expect(link).toHaveClass('brand')
})

it('says so in English too', () => {
  renderWithProviders(<BrandLink className="brand" size={30} />, { lang: 'en' })
  expect(screen.getByRole('link', { name: 'Rabisco' })).toHaveAttribute('title', 'Go to the home page')
})
