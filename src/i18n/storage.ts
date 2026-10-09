import { isLanguage, type Language } from './languages'

const STORAGE_KEY = 'rabisco.lang'

export function readStoredLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLanguage(value) ? value : null
  } catch {
    return null
  }
}

export function writeStoredLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Storage unavailable (private mode, blocked cookies): keep the choice in memory only.
  }
}
