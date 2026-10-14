import { cloneStructured, installPolyfills } from './polyfills'

describe('cloneStructured', () => {
  it('copies nested plain data without sharing it', () => {
    const original = { a: 1, list: [1, { b: 2 }], nested: { c: 'x', none: null, gone: undefined } }
    const copy = cloneStructured(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
    expect(copy.list).not.toBe(original.list)
    ;(copy.list[1] as { b: number }).b = 99
    expect((original.list[1] as { b: number }).b).toBe(2)
    expect('gone' in copy.nested).toBe(true)
  })

  it('copies dates, regular expressions, maps, sets and typed arrays', () => {
    const date = new Date('2026-10-14T12:00:00Z')
    const map = new Map<unknown, unknown>([['k', { v: 1 }]])
    const set = new Set([1, 2, 3])
    const bytes = new Uint8Array([1, 2, 3])
    const copy = cloneStructured({ date, re: /ab+c/gi, map, set, bytes })
    expect(copy.date).toEqual(date)
    expect(copy.date).not.toBe(date)
    expect(copy.re.source).toBe('ab+c')
    expect(copy.re.flags).toBe('gi')
    expect(copy.map.get('k')).toEqual({ v: 1 })
    expect(copy.map.get('k')).not.toBe(map.get('k'))
    expect([...copy.set]).toEqual([1, 2, 3])
    expect(copy.bytes).toEqual(bytes)
    expect(copy.bytes.buffer).not.toBe(bytes.buffer)
  })

  it('keeps cycles and shared references', () => {
    const shared = { n: 1 }
    const root: { self?: unknown; a: unknown; b: unknown } = { a: shared, b: shared }
    root.self = root
    const copy = cloneStructured(root)
    expect(copy.self).toBe(copy)
    expect(copy.a).toBe(copy.b)
    expect(copy.a).not.toBe(shared)
  })

  it('turns a class instance into plain data, like the real thing', () => {
    class Point {
      x: number
      y: number
      constructor(x: number, y: number) {
        this.x = x
        this.y = y
      }
      norm() {
        return Math.hypot(this.x, this.y)
      }
    }
    const copy = cloneStructured(new Point(3, 4)) as unknown as Record<string, unknown>
    expect(copy).toEqual({ x: 3, y: 4 })
    expect(copy.norm).toBeUndefined()
  })

  it('refuses what cannot be cloned', () => {
    expect(() => cloneStructured({ f: () => 1 })).toThrow(/could not be cloned/)
    expect(() => cloneStructured(Symbol('s'))).toThrow(/could not be cloned/)
  })

  it('agrees with the native structuredClone on the data the app uses', () => {
    const data = { elements: [{ id: 'a', x: 1.5, points: [[0, 0], [1, 2]], boundElements: null, link: undefined }], appState: { zoom: { value: 1 } } }
    expect(cloneStructured(data)).toEqual(structuredClone(data))
  })
})

describe('installPolyfills', () => {
  it('installs structuredClone and URL.canParse only when they are missing', () => {
    class OldURL {
      constructor(url: string, base?: string) {
        new URL(url, base)
      }
    }
    const scope = { URL: OldURL } as unknown as typeof globalThis
    installPolyfills(scope)
    expect(typeof scope.structuredClone).toBe('function')
    expect(scope.structuredClone({ a: [1] })).toEqual({ a: [1] })
    const canParse = (scope.URL as unknown as { canParse: (url: string, base?: string) => boolean }).canParse
    expect(canParse('https://rabisco.dev/apoie')).toBe(true)
    expect(canParse('/apoie', 'https://rabisco.dev')).toBe(true)
    expect(canParse('not a url')).toBe(false)
  })

  it('leaves the browser versions alone when they exist', () => {
    const native = vi.fn((v: unknown) => v)
    class NewURL {
      static canParse = vi.fn(() => true)
    }
    const scope = { structuredClone: native, URL: NewURL } as unknown as typeof globalThis
    installPolyfills(scope)
    expect(scope.structuredClone).toBe(native)
    expect((scope.URL as unknown as { canParse: unknown }).canParse).toBe(NewURL.canParse)
  })
})
