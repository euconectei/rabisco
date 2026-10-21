// markdown.ts pulls in the real Excalidraw (needs a canvas).
import 'vitest-canvas-mock'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MESSAGES } from '../i18n/messages'
import { parseMarkdownOutline } from '../mindmap/markdown'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import docEn from '../../public/docs/import.md?raw'
import docPtBR from '../../public/docs/import.pt-BR.md?raw'
import llms from '../../public/llms.txt?raw'
import robots from '../../public/robots.txt?raw'
import sitemap from '../../public/sitemap.xml?raw'
import ImportDocsPage from './ImportDocsPage'

const signedOut = signedInAuth({ status: 'signed-out', user: null, hint: null })
const DOCS = { 'pt-BR': docPtBR, en: docEn }

const LANGS = [
  ['pt-BR', 'docs/import.pt-BR.md', 'Criar mapas com IA'],
  ['en', 'docs/import.md', 'Create maps with AI'],
] as const

it.each(LANGS)('the page exists in %s, signed out, with the prompt and the example', (lang, _file, title) => {
  renderWithProviders(<ImportDocsPage />, { lang, auth: signedOut })
  const { prompt, example } = MESSAGES[lang].importDocs
  expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  expect(document.body).toHaveTextContent(prompt.split('\n')[0])
  expect(screen.getByText(example, { normalizer: (s) => s })).toBeInTheDocument()
})

it.each(LANGS)('the example in %s is an outline the importer reads as one map', (lang) => {
  const outline = parseMarkdownOutline(MESSAGES[lang].importDocs.example, 'fallback')
  expect(outline?.children.map((c) => c.text)).toHaveLength(2)
  expect(outline?.children.every((c) => c.children.length === 2)).toBe(true)
  expect(outline?.text).not.toBe('fallback')
})

it.each(LANGS)('the static %s document carries the same prompt and example as the page', (lang) => {
  const { prompt, example } = MESSAGES[lang].importDocs
  const doc = DOCS[lang]
  expect(doc).toContain(prompt)
  expect(doc).toContain(example)
})

it('llms.txt points to the static docs and the sitemap lists the page', () => {
  expect(llms).toMatch(/^# Rabisco/)
  for (const [, file] of LANGS) expect(llms).toContain(`/${file})`)
  expect(robots).toContain('Sitemap: https://rabisco.dev/sitemap.xml')
  expect(robots).not.toMatch(/^Disallow: \/$/m)
  expect(sitemap).toContain('<loc>https://rabisco.dev/docs/import</loc>')
})

it('copies the prompt', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ImportDocsPage />, { auth: signedOut })
  await user.click(screen.getByRole('button', { name: 'Copiar prompt' }))
  expect(await screen.findByText('Copiado!')).toBeInTheDocument()
  expect(await navigator.clipboard.readText()).toBe(MESSAGES['pt-BR'].importDocs.prompt)
})

it('says so when the clipboard is unavailable', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ImportDocsPage />, { auth: signedOut })
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
  await user.click(screen.getByRole('button', { name: 'Copiar prompt' }))
  expect(await screen.findByText(/Não deu para copiar/)).toBeInTheDocument()
})
