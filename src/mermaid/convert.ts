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

// Markup that has no place in a diagram and could make the renderer load or run something. A tag is
// `<` glued to its name: browsers do not read `< img` as a tag, so comparisons like `i < a ?` stay valid.
const HTML_MARKUP = /<(img|iframe|svg|script|object|embed|link|style|a|br)[\s>/]|javascript:/i
const LINE_BREAK = /<br\s*\/?>/gi

const MERMAID_CONFIG = { securityLevel: 'strict', maxTextSize: MERMAID_MAX_CHARS, maxEdges: 500 }

/** Content of the first ```mermaid fence of a Markdown note; the whole text when there is none. */
function fencedDiagram(text: string): string {
  const open = text.toLowerCase().indexOf('```mermaid')
  if (open === -1) return text
  const lineEnd = text.indexOf('\n', open)
  if (lineEnd === -1) return ''
  const close = text.indexOf('```', lineEnd)
  return text.slice(lineEnd + 1, close === -1 ? undefined : close)
}

// Directives (`%%{init: ...}%%`, `%%{config: ...}%%`) can change Mermaid's configuration from inside
// the text; the security level must stay the one this app sets. A directive that never closes is
// dropped up to the end. Single pass, so a hostile text cannot make it slow.
function stripDirectives(text: string): string {
  let result = ''
  let from = 0
  for (;;) {
    const open = text.indexOf('%%{', from)
    if (open === -1) return result + text.slice(from)
    result += text.slice(from, open)
    const close = text.indexOf('}%%', open + 3)
    if (close === -1) return result
    from = close + 3
  }
}

// `<br>` is how Mermaid labels spell a line break. Inside a quoted label it becomes a real one; outside
// quotes a newline would end the statement, so it becomes a space.
function lineBreaks(text: string): string {
  let result = ''
  let from = 0
  let quoted = false
  for (const match of text.matchAll(LINE_BREAK)) {
    for (let i = from; i < match.index; i += 1) if (text.charAt(i) === '"') quoted = !quoted
    result += text.slice(from, match.index) + (quoted ? '\n' : ' ')
    from = match.index + match[0].length
  }
  return result + text.slice(from)
}

/** The text that is actually handed to Mermaid, or a MermaidError when it must not be rendered. */
export function prepareMermaidText(text: string): string {
  // The size check comes first: everything below is linear, but there is no reason to touch a huge text.
  if (text.length > MERMAID_MAX_CHARS) throw new MermaidError('tooLarge')
  const cleaned = lineBreaks(stripDirectives(fencedDiagram(text))).trim()
  if (!cleaned) throw new MermaidError('empty')
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
    if (error instanceof Error && /edge limit exceeded/i.test(error.message)) throw new MermaidError('tooManyElements')
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
