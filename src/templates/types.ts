import type { Language } from '../i18n/languages'

/** A filled template carries real content (a school subject); a structure is an empty skeleton to fill in. */
export type TemplateKind = 'filled' | 'structure'
export type TemplateDiagram = 'mindmap' | 'flowchart'
export type TemplateCategory = 'study' | 'work'

export interface TemplateSection {
  heading: string
  paragraphs?: string[]
  items?: string[]
}

export interface TemplateLocale {
  slug: string
  title: string
  description: string
  intro: string
  sections: TemplateSection[]
  /** Mind map: a markdown outline (headings and lists). Flowchart: Mermaid `flowchart` text. */
  source: string
  imageAlt: string
}

export interface Template {
  id: string
  kind: TemplateKind
  diagram: TemplateDiagram
  category: TemplateCategory
  /** Ids of templates linked from this one (a structure and the examples that use it). */
  related: string[]
  /** Each language is written for its own readers, not translated; a topic may exist in one language only. */
  locales: Partial<Record<Language, TemplateLocale>>
}
