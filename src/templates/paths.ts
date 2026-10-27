import type { Language } from '../i18n/languages'

// Kept apart from the registry so links to the templates (footer, landing) don't pull every template's text into the bundle.
const BASE_PATH: Record<Language, string> = { 'pt-BR': '/modelos', en: '/en/templates' }

export function templatesIndexPath(lang: Language): string {
  return BASE_PATH[lang]
}
