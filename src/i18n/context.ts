import { createContext } from 'react'
import type { Language } from './languages'
import type { Messages } from './pt-BR'

export interface I18nValue {
  lang: Language
  t: Messages
  setLang: (lang: Language) => void
}

export const I18nContext = createContext<I18nValue | null>(null)
