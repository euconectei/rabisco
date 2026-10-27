import { createContext } from 'react'
import type { Language } from './languages'
import type { Messages } from './pt-BR'

export interface I18nValue {
  lang: Language
  t: Messages
  /** `persist: false` shows a language without making it the saved choice (pages written in one language). */
  setLang: (lang: Language, options?: { persist?: boolean }) => void
}

export const I18nContext = createContext<I18nValue | null>(null)
