import type { ExcalidrawElementSkeleton } from './skeleton'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { widenDiamonds } from './diamond'

/** Longest Mermaid text accepted; rendering cost grows quickly with it. */
export const MERMAID_MAX_CHARS = 20_000
/** Most elements a converted diagram may have (labels count), so a hostile text cannot freeze the editor. */
export const MERMAID_MAX_ELEMENTS = 1_500

export interface MermaidResult {
  elements: ExcalidrawElement[]
  files: BinaryFiles
  /** File name without the extension, or the default name when the text was pasted. */
  name: string
}

export type MermaidErrorCode = 'empty' | 'syntax' | 'unsupported' | 'tooLarge' | 'tooManyElements' | 'failed'

/** A failure the user can act on; `code` maps to a `mermaid.errors.*` message. */
export class MermaidError extends Error {
  readonly code: MermaidErrorCode
  constructor(code: MermaidErrorCode) {
    super(code)
    this.name = 'MermaidError'
    this.code = code
  }
}

// Directives (`%%{init: ...}%%`, `%%{config: ...}%%`) can change Mermaid's configuration from inside
// the text; the security level must stay the one this app sets.
const DIRECTIVE = /%%\{[\s\S]*?\}%%/g
// Markup that has no place in a diagram and could make the renderer load or run something.
const HTML_MARKUP = /<\s*(img|iframe|svg|script|object|embed|link|style|a)[\s>/]|javascript:/i

const MERMAID_CONFIG = { securityLevel: 'strict', maxTextSize: MERMAID_MAX_CHARS, maxEdges: 500 }

/** The text that is actually handed to Mermaid, or a MermaidError when it must not be rendered. */
export function prepareMermaidText(text: string): string {
  const cleaned = text.replace(DIRECTIVE, '').trim()
  if (!cleaned) throw new MermaidError('empty')
  if (text.length > MERMAID_MAX_CHARS) throw new MermaidError('tooLarge')
  if (HTML_MARKUP.test(cleaned)) throw new MermaidError('syntax')
  return cleaned
}

/** Mermaid leaves its temporary render nodes in the body when a diagram fails to render. */
export function removeMermaidLeftovers(): void {
  document.querySelectorAll('[id^="dmermaid"], [id^="mermaid-to-excalidraw"]').forEach((node) => node.remove())
}

function isImage(item: { type?: string }): boolean {
  return item.type === 'image' || item.type === 'graphImage'
}

function sanitizeLink<T extends { link?: unknown }>(item: T): T {
  if (item.link == null) return item
  // Links come from `click` lines of the diagram. None is kept: a drawing must not carry a link
  // (javascript: included) chosen by whoever wrote the pasted text.
  return { ...item, link: null }
}

function assertWithinLimit(count: number): void {
  if (count > MERMAID_MAX_ELEMENTS) throw new MermaidError('tooManyElements')
}

/** Converts Mermaid text into editable Excalidraw elements. Throws MermaidError. */
export async function convertMermaid(text: string): Promise<{ elements: ExcalidrawElement[]; files: BinaryFiles }> {
  const definition = prepareMermaidText(text)

  let library: typeof import('@excalidraw/mermaid-to-excalidraw')
  let excalidraw: typeof import('@excalidraw/excalidraw')
  try {
    ;[library, excalidraw] = await Promise.all([import('@excalidraw/mermaid-to-excalidraw'), import('@excalidraw/excalidraw')])
  } catch {
    throw new MermaidError('failed')
  }

  let skeletons: ExcalidrawElementSkeleton[]
  try {
    const parsed = await library.parseMermaidToExcalidraw(definition, MERMAID_CONFIG)
    skeletons = parsed.elements
    // A diagram the library cannot map comes back as an SVG picture: not editable, so not accepted.
    if (skeletons.some(isImage)) throw new MermaidError('unsupported')
  } catch (error) {
    if (error instanceof MermaidError) throw error
    throw new MermaidError('syntax')
  } finally {
    removeMermaidLeftovers()
  }
  assertWithinLimit(skeletons.length)

  let elements: ExcalidrawElement[]
  try {
    const safe = widenDiamonds(skeletons.map(sanitizeLink))
    elements = excalidraw.convertToExcalidrawElements(safe, { regenerateIds: true }) as ExcalidrawElement[]
  } catch {
    throw new MermaidError('failed')
  }
  assertWithinLimit(elements.length)
  if (elements.some(isImage)) throw new MermaidError('unsupported')
  if (elements.length === 0) throw new MermaidError('unsupported')

  return { elements: elements.map(sanitizeLink), files: {} }
}

/** The `.excalidraw` JSON the editor opens through the import state. */
export function mermaidSceneJson(result: MermaidResult): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'rabisco',
    elements: result.elements,
    appState: {},
    files: result.files,
  })
}
