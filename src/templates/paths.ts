import type { Language } from '../i18n/languages'
import type { Template } from './types'

// Kept apart from the registry so links to the templates (footer, landing) don't pull every template's text into the bundle.
const BASE_PATH: Record<Language, string> = { 'pt-BR': '/modelos', en: '/en/templates' }

export function templatesIndexPath(lang: Language): string {
  return BASE_PATH[lang]
}

export function templateImagePath(template: Template, lang: Language): string {
  return `/templates/${template.id}.${lang}.webp`
}
