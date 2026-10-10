import 'vitest-canvas-mock'
import { collapse } from './collapse'
import { addChild, createMap } from './commands'
import { mapToOutline, outlineToMarkdown, parseMarkdownOutline, type OutlineNode } from './markdown'

const n = (text: string, ...children: OutlineNode[]): OutlineNode => ({ text, children })

describe('outlineToMarkdown', () => {
  it('writes a list with two spaces per level', () => {
    expect(outlineToMarkdown(n('Raiz', n('Filho', n('Neto')), n('Outro')))).toBe('- Raiz\n  - Filho\n    - Neto\n  - Outro\n')
  })

  it('keeps each node on one line', () => {
    expect(outlineToMarkdown(n('duas\nlinhas'))).toBe('- duas linhas\n')
  })
})

describe('parseMarkdownOutline', () => {
  it.each([
    ['dashes', '- Raiz\n  - A\n    - A1\n  - B'],
    ['stars', '* Raiz\n  * A\n    * A1\n  * B'],
    ['numbers', '1. Raiz\n   1. A\n      1. A1\n   2. B'],
    ['tabs', '- Raiz\n\t- A\n\t\t- A1\n\t- B'],
    ['four spaces', '- Raiz\n    - A\n        - A1\n    - B'],
  ])('reads lists with %s', (_name, text) => {
    expect(parseMarkdownOutline(text, 'Mapa')).toEqual(n('Raiz', n('A', n('A1')), n('B')))
  })

  it('reads headings by level, with lists under them', () => {
    const text = '# Projeto\n\n## Pesquisa\n- entrevistas\n- dados\n  - planilha\n## Protótipo\n'
    expect(parseMarkdownOutline(text, 'Mapa')).toEqual(
      n('Projeto', n('Pesquisa', n('entrevistas'), n('dados', n('planilha'))), n('Protótipo')),
    )
  })

  it('puts several top-level items under a root with the fallback name', () => {
    expect(parseMarkdownOutline('- um\n- dois', 'Notas')).toEqual(n('Notas', n('um'), n('dois')))
  })

  it('ignores blank lines', () => {
    expect(parseMarkdownOutline('\n- Raiz\n\n  - A\n\n', 'Mapa')).toEqual(n('Raiz', n('A')))
  })

  it.each([['uma frase qualquer'], ['https://example.com/a-b'], [''], ['   \n  '], ['texto\ncom duas linhas']])(
    'returns null for text that is not a list nor headings: %j',
    (text) => {
      expect(parseMarkdownOutline(text, 'Mapa')).toBeNull()
    },
  )

  it('round-trips texts with #, -, emoji and accents', () => {
    const tree = n('# não é título', n('- não é item', n('🚀 lançamento')), n('1. ação — já'), n('Coração ❤️ & <tags>'))
    expect(parseMarkdownOutline(outlineToMarkdown(tree), 'Mapa')).toEqual(tree)
  })
})

describe('mapToOutline', () => {
  function sample() {
    let r = createMap([], { x: 0, y: 0 }, 'Raiz')
    const root = r.select!
    r = addChild(r.elements, root, 'A')
    const a = r.select!
    r = addChild(r.elements, a, 'A1')
    r = addChild(r.elements, root, 'B')
    return { elements: r.elements, root, a }
  }

  it('reads the tree with the node texts in order', () => {
    const s = sample()
    const mapId = (s.elements.find((e) => e.id === s.root)!.customData as { rabisco: { mapId: string } }).rabisco.mapId
    expect(mapToOutline(s.elements, mapId)).toEqual(n('Raiz', n('A', n('A1')), n('B')))
  })

  it('includes collapsed branches', () => {
    const s = sample()
    const mapId = (s.elements.find((e) => e.id === s.root)!.customData as { rabisco: { mapId: string } }).rabisco.mapId
    const collapsed = collapse(s.elements, s.a).elements
    expect(mapToOutline(collapsed, mapId)).toEqual(n('Raiz', n('A', n('A1')), n('B')))
  })
})
