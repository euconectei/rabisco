import { useEffect } from 'react'
import type { Language } from '../i18n/languages'
import { useI18n } from '../i18n/useI18n'

/**
 * Template pages are written for one language: the rest of the interface follows the page's, without
 * changing the language the visitor chose for the rest of the site.
 */
export function useRouteLanguage(lang: Language): void {
  const { lang: current, setLang } = useI18n()
  useEffect(() => {
    if (current !== lang) setLang(lang, { persist: false })
  }, [current, lang, setLang])
}
