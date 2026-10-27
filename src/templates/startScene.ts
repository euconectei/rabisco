import type { Language } from '../i18n/languages'
import { convertMermaid, mermaidSceneJson } from '../mermaid/convert'
import { importOutline } from '../mindmap/importMap'
import { parseMarkdownOutline } from '../mindmap/outline'
import { serializeScene } from '../editor/scene'
import { templateById } from './registry'
import type { Template, TemplateLocale } from './types'

/** The template named by `?template=` in a URL's query string. */
export function templateFromSearch(search: string): Template | undefined {
  const id = new URLSearchParams(search).get('template')
  return id ? templateById(id) : undefined
}

/** The version to open: the current language when the template has it, the other one otherwise. */
export function templateLocale(template: Template, lang: Language): TemplateLocale {
  return template.locales[lang] ?? Object.values(template.locales)[0]!
}

/** The `.excalidraw` JSON of a new drawing holding the template. Throws MermaidError when a flowchart cannot be converted. */
export async function templateSceneJson(template: Template, lang: Language): Promise<string> {
  const locale = templateLocale(template, lang)
  if (template.diagram === 'flowchart') {
    const { elements, files } = await convertMermaid(locale.source)
    return mermaidSceneJson({ elements, files, name: locale.title })
  }
  const outline = parseMarkdownOutline(locale.source, locale.title) ?? { text: locale.title, children: [] }
  const { elements } = importOutline([], outline, { x: 0, y: 0 })
  return serializeScene({ elements, appState: {}, files: {} })
}
