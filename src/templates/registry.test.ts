import { LANGUAGES } from '../i18n/languages'
import { parseMarkdownOutline } from '../mindmap/outline'
import { TEMPLATES, templateById, templateBySlug, templatePath, templatesIn, wordCount } from './registry'

describe('templates registry', () => {
  it('has unique ids and unique, url-safe slugs per language', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    for (const lang of LANGUAGES) {
      const slugs = templatesIn(lang).map((t) => t.locales[lang]!.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s is complete in every language it has', (_id, template) => {
    const locales = Object.entries(template.locales)
    expect(locales.length).toBeGreaterThan(0)
    for (const related of template.related) {
      expect(related).not.toBe(template.id)
      expect(templateById(related), `related ${related}`).toBeDefined()
    }
    for (const [lang, locale] of locales) {
      const words = wordCount(locale!)
      expect(words, `${lang} word count`).toBeGreaterThanOrEqual(300)
      expect(words, `${lang} word count`).toBeLessThanOrEqual(600)
      expect(locale!.description.length, `${lang} description`).toBeLessThanOrEqual(170)
      if (template.diagram === 'mindmap') {
        const outline = parseMarkdownOutline(locale!.source, locale!.title, { strict: true })
        expect(outline, `${lang} outline`).not.toBeNull()
        expect(outline!.children.length).toBeGreaterThanOrEqual(3)
      } else {
        expect(locale!.source.trimStart()).toMatch(/^flowchart /)
      }
    }
  })

  it('builds the page path of each language', () => {
    const template = templateById('revolucao-francesa')!
    expect(templatePath('pt-BR', template)).toBe('/modelos/revolucao-francesa')
    expect(templatePath('en', template)).toBe('/en/templates/french-revolution')
    expect(templatePath('en', { ...template, locales: { 'pt-BR': template.locales['pt-BR'] } })).toBeNull()
  })

  it('finds a template by its slug in a language', () => {
    expect(templateBySlug('en', 'french-revolution')?.id).toBe('revolucao-francesa')
    expect(templateBySlug('pt-BR', 'french-revolution')).toBeUndefined()
  })
})
