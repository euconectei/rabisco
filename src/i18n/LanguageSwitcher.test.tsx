import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageSwitcher } from './LanguageSwitcher'
import { renderWithProviders } from '../test/renderWithProviders'

afterEach(() => localStorage.clear())

it('shows short codes, marks the current language and names each option in full', () => {
  renderWithProviders(<LanguageSwitcher />)
  const group = screen.getByRole('group', { name: 'Idioma' })
  const pt = within(group).getByRole('button', { name: 'Português' })
  const en = within(group).getByRole('button', { name: 'English' })
  expect(pt).toHaveTextContent('PT')
  expect(en).toHaveTextContent('EN')
  expect(pt).toHaveAttribute('aria-pressed', 'true')
  expect(en).toHaveAttribute('aria-pressed', 'false')
  expect(en).toHaveAttribute('lang', 'en')
})

it('switches with one tap', async () => {
  renderWithProviders(<LanguageSwitcher />)
  await userEvent.click(screen.getByRole('button', { name: 'English' }))
  expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
})
