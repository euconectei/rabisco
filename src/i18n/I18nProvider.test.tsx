import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from './I18nProvider'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useI18n } from './useI18n'

function Probe() {
  const { lang, t } = useI18n()
  return <p data-testid="probe">{lang}:{t.landing.start}</p>
}

function setup(initialLanguage?: 'pt-BR' | 'en') {
  render(
    <I18nProvider initialLanguage={initialLanguage}>
      <Probe />
      <LanguageSwitcher />
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('uses the stored language over the browser language', () => {
  localStorage.setItem('rabisco.lang', 'en')
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
  setup()
  expect(screen.getByTestId('probe')).toHaveTextContent('en:Get started')
})

it('falls back to the browser language', () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
  setup()
  expect(screen.getByTestId('probe')).toHaveTextContent('pt-BR:Começar')
})

it('switches language, persists it and updates <html lang>', async () => {
  setup('pt-BR')
  await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'en')
  expect(screen.getByTestId('probe')).toHaveTextContent('en:Get started')
  expect(localStorage.getItem('rabisco.lang')).toBe('en')
  expect(document.documentElement.lang).toBe('en')
})

it('still switches language when storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  setup()
  expect(screen.getByTestId('probe')).toHaveTextContent('en:Get started')
  await userEvent.selectOptions(screen.getByLabelText('Language'), 'pt-BR')
  expect(screen.getByTestId('probe')).toHaveTextContent('pt-BR:Começar')
})

it('throws a clear error outside the provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Probe />)).toThrow('useI18n must be used inside <I18nProvider>')
})
