import { convertMermaid, MERMAID_MAX_CHARS, MERMAID_MAX_ELEMENTS, mermaidSceneJson, MermaidError, prepareMermaidText } from './convert'

const parse = vi.fn()
const convert = vi.fn()

vi.mock('@excalidraw/mermaid-to-excalidraw', () => ({ parseMermaidToExcalidraw: (...args: unknown[]) => parse(...args) }))
vi.mock('@excalidraw/excalidraw', () => ({ convertToExcalidrawElements: (...args: unknown[]) => convert(...args) }))

const FLOW = 'flowchart TD\n  A[Start] --> B{Payment ok?}'

function skeletons(count: number, extra: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, index) => ({ type: 'rectangle', id: `n${index}`, x: index, y: 0, width: 10, height: 10, ...extra }))
}

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof MermaidError) return error.code
    throw error
  }
  return 'none'
}

beforeEach(() => {
  parse.mockReset()
  convert.mockReset()
  parse.mockResolvedValue({ elements: skeletons(2) })
  convert.mockImplementation((items: unknown[]) => items)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('convertMermaid', () => {
  it('converts a flowchart into elements with no files', async () => {
    const result = await convertMermaid(FLOW)
    expect(result.elements).toHaveLength(2)
    expect(result.files).toEqual({})
  })

  it('asks the library for the strict security level and a text limit', async () => {
    await convertMermaid(FLOW)
    expect(parse).toHaveBeenCalledWith(FLOW, expect.objectContaining({ securityLevel: 'strict', maxTextSize: MERMAID_MAX_CHARS }))
  })

  it('regenerates ids so an inserted diagram cannot collide with existing elements', async () => {
    await convertMermaid(FLOW)
    expect(convert).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ regenerateIds: true }))
  })

  it('removes init and config directives before converting, whatever the casing or line breaks', async () => {
    await convertMermaid(`%%{init: {"securityLevel":"loose"}}%%\n${FLOW}\n%%{\n config: { securityLevel: 'loose' }\n}%%`)
    const sent = parse.mock.calls[0][0] as string
    expect(sent).not.toMatch(/%%\{/)
    expect(sent).not.toMatch(/loose/)
    expect(sent).toContain('flowchart TD')
  })

  it('rejects empty and whitespace-only text without loading the library', async () => {
    expect(await code(convertMermaid(''))).toBe('empty')
    expect(await code(convertMermaid('  \n\t '))).toBe('empty')
    expect(await code(convertMermaid('%%{init: {}}%%'))).toBe('empty')
    expect(parse).not.toHaveBeenCalled()
  })

  it('rejects text over the limit before calling the library', async () => {
    expect(await code(convertMermaid(`flowchart TD\n${'A-->B\n'.repeat(MERMAID_MAX_CHARS)}`))).toBe('tooLarge')
    expect(parse).not.toHaveBeenCalled()
  })

  it('accepts text exactly at the limit', async () => {
    const text = `flowchart TD\n${'x'.repeat(MERMAID_MAX_CHARS - 13)}`
    expect(text.length).toBe(MERMAID_MAX_CHARS)
    expect(await code(convertMermaid(text))).toBe('none')
  })

  it('rejects thousands of isolated nodes by the element limit', async () => {
    parse.mockResolvedValue({ elements: skeletons(6000) })
    expect(await code(convertMermaid(FLOW))).toBe('tooManyElements')
    expect(convert).not.toHaveBeenCalled()
  })

  it('rejects when conversion itself expands past the element limit', async () => {
    convert.mockReturnValue(skeletons(MERMAID_MAX_ELEMENTS + 1))
    expect(await code(convertMermaid(FLOW))).toBe('tooManyElements')
  })

  it('turns a library syntax failure into a friendly syntax error', async () => {
    parse.mockRejectedValue(new Error('Parse error on line 2: Expecting got EOF\n    at stack'))
    const error = await convertMermaid('flowchart TD\nA--').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MermaidError)
    expect((error as MermaidError).code).toBe('syntax')
    expect((error as MermaidError).message).not.toMatch(/stack|Parse error/)
  })

  it.each([
    ['img tag', 'flowchart TD\nA["<img src=x onerror=alert(1)>"]'],
    ['remote image', 'flowchart TD\nA["<IMG SRC=https://evil.example/p.png>"]'],
    ['iframe', 'flowchart TD\nA["<iframe src=//evil.example>"]'],
    ['svg', 'flowchart TD\nA["<svg onload=alert(1)>"]'],
    ['script', 'flowchart TD\nA["<script>alert(1)</script>"]'],
    ['anchor', 'flowchart TD\nA["<a href=x>y</a>"]'],
    ['javascript url', 'flowchart TD\nA-->B\nclick A "javascript:alert(1)"'],
    ['spaced tag', 'flowchart TD\nA["< img src=x>"]'],
  ])('refuses text with %s and never reaches the library', async (_name, text) => {
    expect(await code(convertMermaid(text))).toBe('syntax')
    expect(parse).not.toHaveBeenCalled()
  })

  it('does not refuse a plain comparison written with angle brackets', async () => {
    expect(await code(convertMermaid('flowchart TD\nA[x < 5] --> B[y > 3]'))).toBe('none')
  })

  it('rejects a result that came back as a picture', async () => {
    parse.mockResolvedValue({ elements: [{ type: 'image', fileId: 'f', x: 0, y: 0, width: 10, height: 10 }], files: { f: { dataURL: 'data:image/svg+xml;base64,AAA' } } })
    expect(await code(convertMermaid('pie title Pets\n"Dogs": 2'))).toBe('unsupported')
  })

  it('rejects an image element that only appears after conversion', async () => {
    convert.mockReturnValue([{ type: 'image', id: 'i' }])
    expect(await code(convertMermaid(FLOW))).toBe('unsupported')
  })

  it('rejects an empty result instead of creating a blank drawing', async () => {
    parse.mockResolvedValue({ elements: [] })
    convert.mockReturnValue([])
    expect(await code(convertMermaid(FLOW))).toBe('unsupported')
  })

  it('removes links from skeletons and from converted elements', async () => {
    parse.mockResolvedValue({ elements: skeletons(2, { link: 'javascript:alert(1)' }) })
    convert.mockImplementation((items: Array<Record<string, unknown>>) => items.map((item) => ({ ...item, link: 'https://evil.example' })))
    const result = await convertMermaid(FLOW)
    expect((convert.mock.calls[0][0] as Array<{ link?: unknown }>).every((item) => item.link == null)).toBe(true)
    expect(result.elements.every((element) => element.link == null)).toBe(true)
  })

  it('returns no files even when the library returns some', async () => {
    parse.mockResolvedValue({ elements: skeletons(1), files: { x: { dataURL: 'data:image/png;base64,AAA' } } })
    expect((await convertMermaid(FLOW)).files).toEqual({})
  })

  it('removes the temporary nodes Mermaid leaves in the body, on success and on failure', async () => {
    const leave = () => {
      for (const id of ['dmermaid-to-excalidraw-0', 'dmermaid-7', 'mermaid-to-excalidraw-0-container']) {
        const node = document.createElement('div')
        node.id = id
        document.body.appendChild(node)
      }
      const keep = document.createElement('div')
      keep.id = 'root'
      document.body.appendChild(keep)
    }
    parse.mockImplementationOnce(async () => {
      leave()
      throw new Error('boom')
    })
    await code(convertMermaid(FLOW))
    expect(document.body.children).toHaveLength(1)
    expect(document.getElementById('root')).not.toBeNull()

    parse.mockImplementationOnce(async () => {
      leave()
      return { elements: skeletons(1) }
    })
    document.body.innerHTML = ''
    await convertMermaid(FLOW)
    expect(document.body.children).toHaveLength(1)
    expect(document.getElementById('root')).not.toBeNull()
  })
})

describe('prepareMermaidText', () => {
  it('trims and returns the text to render', () => {
    expect(prepareMermaidText('  flowchart TD\nA-->B \n')).toBe('flowchart TD\nA-->B')
  })
})

describe('mermaidSceneJson', () => {
  it('writes a drawing the editor can open', () => {
    const json = JSON.parse(mermaidSceneJson({ elements: [{ id: 'a' } as never], files: {}, name: 'x' })) as Record<string, unknown>
    expect(json.type).toBe('excalidraw')
    expect(json.elements).toEqual([{ id: 'a' }])
    expect(json.files).toEqual({})
  })
})
