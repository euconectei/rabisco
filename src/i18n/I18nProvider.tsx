import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext } from './context'
import { detectLanguage, type Language } from './languages'
import { MESSAGES } from './messages'
import { readStoredLanguage, writeStoredLanguage } from './storage'

interface Props {
  children: ReactNode
  initialLanguage?: Language
}

export function I18nProvider({ children, initialLanguage }: Props) {
  const [lang, setLangState] = useState<Language>(
    () => initialLanguage ?? readStoredLanguage() ?? detectLanguage(navigator.language),
  )

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Language) => {
    setLangState(next)
    writeStoredLanguage(next)
  }, [])

  const value = useMemo(() => ({ lang, t: MESSAGES[lang], setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
