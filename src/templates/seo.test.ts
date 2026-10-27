import { isPtBrPagePath } from '../seo'
import { templateById } from './registry'
import { templateSeo, templatesIndexSeo } from './seo'

it('gives a template page its own canonical and links both languages', () => {
  const seo = templateSeo('pt-BR', templateById('revolucao-francesa')!)
  expect(seo.url).toBe('https://rabisco.dev/modelos/revolucao-francesa')
  expect(seo.title).toBe('Mapa mental da Revolução Francesa — Rabisco')
  expect(seo.ogImageUrl).toBe('https://rabisco.dev/templates/revolucao-francesa.pt-BR.webp')
  expect(seo.alternates).toEqual([
    { hreflang: 'pt-BR', url: 'https://rabisco.dev/modelos/revolucao-francesa' },
    { hreflang: 'en', url: 'https://rabisco.dev/en/templates/french-revolution' },
    { hreflang: 'x-default', url: 'https://rabisco.dev/modelos/revolucao-francesa' },
  ])
  const graph = JSON.parse(seo.jsonLd)['@graph']
  expect(graph[1]).toMatchObject({ '@type': 'LearningResource', inLanguage: 'pt-BR', isAccessibleForFree: true })
  expect(graph[0].itemListElement.map((item: { name: string }) => item.name)).toEqual(['Rabisco', 'Modelos', 'Mapa mental da Revolução Francesa'])
})

it('links only the existing version of a one-language template', () => {
  const template = templateById('revolucao-francesa')!
  const ptOnly = { ...template, locales: { 'pt-BR': template.locales['pt-BR'] } }
  expect(templateSeo('pt-BR', ptOnly).alternates.map((a) => a.hreflang)).toEqual(['pt-BR', 'x-default'])
  expect(() => templateSeo('en', ptOnly)).toThrow()
})

it('describes the template lists', () => {
  expect(templatesIndexSeo('en').url).toBe('https://rabisco.dev/en/templates')
  expect(templatesIndexSeo('pt-BR').alternates.at(-1)).toEqual({ hreflang: 'x-default', url: 'https://rabisco.dev/modelos' })
})

it('treats template pages in Portuguese as pt-BR pages, whatever the browser language', () => {
  expect(isPtBrPagePath('/modelos')).toBe(true)
  expect(isPtBrPagePath('/modelos/revolucao-francesa')).toBe(true)
  expect(isPtBrPagePath('/modelosx')).toBe(false)
  expect(isPtBrPagePath('/en/templates/french-revolution')).toBe(false)
})
