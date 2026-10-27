import { LANGUAGES, type Language } from '../i18n/languages'
import { MESSAGES } from '../i18n/messages'
import { BASE_URL } from '../seo'
import { templatePath, templatesIndexPath } from './registry'
import { templateImagePath } from './TemplatePage'
import type { Template } from './types'

export interface Alternate {
  hreflang: string
  url: string
}

export interface PageSeo {
  url: string
  title: string
  description: string
  ogLocale: string
  ogImageUrl: string
  alternates: Alternate[]
  jsonLd: string
}

const OG_LOCALE: Record<Language, string> = { 'pt-BR': 'pt_BR', en: 'en_US' }
const FALLBACK_IMAGE: Record<Language, string> = { 'pt-BR': '/landing/pt-BR-canvas-light.webp', en: '/landing/en-canvas-light.webp' }

/** hreflang links for the versions that exist; x-default is the pt-BR page when there is one. */
function alternatesOf(paths: Partial<Record<Language, string>>): Alternate[] {
  const alternates = LANGUAGES.filter((lang) => paths[lang]).map((lang) => ({ hreflang: lang, url: `${BASE_URL}${paths[lang]}` }))
  const fallback = paths['pt-BR'] ?? paths.en
  return fallback ? [...alternates, { hreflang: 'x-default', url: `${BASE_URL}${fallback}` }] : alternates
}

function breadcrumb(lang: Language, items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Rabisco', url: `${BASE_URL}${lang === 'en' ? '/en/' : '/'}` }, ...items].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function templatesIndexSeo(lang: Language): PageSeo {
  const t = MESSAGES[lang].templates
  const url = `${BASE_URL}${templatesIndexPath(lang)}`
  return {
    url,
    title: `${t.indexTitle} — Rabisco`,
    description: t.indexDescription,
    ogLocale: OG_LOCALE[lang],
    ogImageUrl: `${BASE_URL}${FALLBACK_IMAGE[lang]}`,
    alternates: alternatesOf({ 'pt-BR': templatesIndexPath('pt-BR'), en: templatesIndexPath('en') }),
    jsonLd: JSON.stringify({ '@context': 'https://schema.org', ...breadcrumb(lang, [{ name: t.breadcrumb, url }]) }),
  }
}

export function templateSeo(lang: Language, template: Template): PageSeo {
  const locale = template.locales[lang]
  const path = templatePath(lang, template)
  if (!locale || !path) throw new Error(`Template ${template.id} has no ${lang} version`)
  const t = MESSAGES[lang].templates
  const url = `${BASE_URL}${path}`
  const image = `${BASE_URL}${templateImagePath(template, lang)}`
  const paths = Object.fromEntries(LANGUAGES.map((code) => [code, templatePath(code, template)]).filter(([, value]) => value)) as Partial<Record<Language, string>>
  return {
    url,
    title: `${locale.title} — Rabisco`,
    description: locale.description,
    ogLocale: OG_LOCALE[lang],
    ogImageUrl: image,
    alternates: alternatesOf(paths),
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumb(lang, [
          { name: t.breadcrumb, url: `${BASE_URL}${templatesIndexPath(lang)}` },
          { name: locale.title, url },
        ]),
        {
          '@type': template.category === 'study' ? 'LearningResource' : 'CreativeWork',
          name: locale.title,
          description: locale.description,
          url,
          image,
          inLanguage: lang,
          isAccessibleForFree: true,
          publisher: { '@type': 'Organization', name: 'Rabisco', url: BASE_URL },
        },
      ],
    }),
  }
}
