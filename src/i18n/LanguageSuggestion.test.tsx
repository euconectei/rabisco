import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from './I18nProvider'
import { LanguageSuggestion } from './LanguageSuggestion'
import { useI18n } from './useI18n'

function Probe() {
  const { lang } = useI18n()
  return <p data-testid="probe">{lang}</p>
}

function setup() {
  render(
    <I18nProvider>
      <LanguageSuggestion />
      <Probe />
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

it('keeps a pt-BR page in pt-BR for an English browser and offers English', async () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  setup()
  expect(screen.getByTestId('probe')).toHaveTextContent('pt-BR')
  await userEvent.click(screen.getByRole('button', { name: 'View in English' }))
  expect(screen.getByTestId('probe')).toHaveTextContent('en')
  expect(localStorage.getItem('rabisco.lang')).toBe('en')
  expect(screen.queryByRole('region', { name: 'Language' })).not.toBeInTheDocument()
})

it('stays in Portuguese and remembers the choice when dismissed', async () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Stay in Portuguese' }))
  expect(screen.getByTestId('probe')).toHaveTextContent('pt-BR')
  expect(localStorage.getItem('rabisco.lang')).toBe('pt-BR')
  expect(screen.queryByRole('region', { name: 'Language' })).not.toBeInTheDocument()
})

it('is not shown to Portuguese browsers', () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
  setup()
  expect(screen.queryByRole('region', { name: 'Language' })).not.toBeInTheDocument()
})

it('app pages still follow the browser language', () => {
  window.history.replaceState(null, '', '/app')
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  setup()
  expect(screen.getByTestId('probe')).toHaveTextContent('en')
  expect(screen.queryByRole('region', { name: 'Language' })).not.toBeInTheDocument()
})
