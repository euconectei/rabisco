import type { Language } from '../i18n/languages'
import { decisaoSimNao } from './content/decisao-sim-nao'
import { resumo } from './content/resumo'
import { revolucaoFrancesa } from './content/revolucao-francesa'
import { templatesIndexPath } from './paths'
import type { Template, TemplateLocale } from './types'

export const TEMPLATES: readonly Template[] = [revolucaoFrancesa, resumo, decisaoSimNao]

export { templatesIndexPath } from './paths'

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id)
}

export function templateBySlug(lang: Language, slug: string): Template | undefined {
  return TEMPLATES.find((template) => template.locales[lang]?.slug === slug)
}

/** The page of a template in a language, or null when it has no version in that language. */
export function templatePath(lang: Language, template: Template): string | null {
  const locale = template.locales[lang]
  return locale ? `${templatesIndexPath(lang)}/${locale.slug}` : null
}

export function templatesIn(lang: Language): Template[] {
  return TEMPLATES.filter((template) => template.locales[lang] !== undefined)
}

/** Words of the page's own text (intro and sections), the part that must stand on its own. */
export function wordCount(locale: TemplateLocale): number {
  const texts = [locale.intro, ...locale.sections.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.items ?? [])])]
  return texts.join(' ').split(/\s+/).filter(Boolean).length
}
