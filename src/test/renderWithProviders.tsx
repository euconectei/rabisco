import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import type { Language } from '../i18n/languages'

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', lang = 'pt-BR' }: { route?: string; lang?: Language } = {},
) {
  return render(
    <I18nProvider initialLanguage={lang}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </I18nProvider>,
  )
}
