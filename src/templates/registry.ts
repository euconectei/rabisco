import type { Language } from '../i18n/languages'
import { celula } from './content/celula'
import { decisaoSimNao } from './content/decisao-sim-nao'
import { eraVargas } from './content/era-vargas'
import { figurasDeLinguagem } from './content/figuras-de-linguagem'
import { fluxogramaDeProcesso } from './content/fluxograma-de-processo'
import { fotossintese } from './content/fotossintese'
import { guerraFria } from './content/guerra-fria'
import { mapaEmBranco } from './content/mapa-em-branco'
import { processoDeCompras } from './content/processo-de-compras'
import { resumo } from './content/resumo'
import { revolucaoFrancesa } from './content/revolucao-francesa'
import { revolucaoIndustrial } from './content/revolucao-industrial'
import { segundaGuerra } from './content/segunda-guerra'
import { sistemaNervoso } from './content/sistema-nervoso'
import { templatesIndexPath } from './paths'
import type { Template, TemplateLocale } from './types'

export const TEMPLATES: readonly Template[] = [
  revolucaoFrancesa,
  segundaGuerra,
  guerraFria,
  revolucaoIndustrial,
  eraVargas,
  figurasDeLinguagem,
  celula,
  sistemaNervoso,
  fotossintese,
  resumo,
  mapaEmBranco,
  decisaoSimNao,
  fluxogramaDeProcesso,
  processoDeCompras,
]

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
