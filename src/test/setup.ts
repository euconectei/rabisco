import '@testing-library/jest-dom/vitest'

// jsdom has no font loading API; Excalidraw touches it when it measures text (e.g. node labels).
class FakeFontFace {
  status = 'loaded'
  family: string
  source: string
  constructor(family: string, source: string) {
    this.family = family
    this.source = source
  }
  load() {
    return Promise.resolve(this)
  }
}
if (!('FontFace' in globalThis)) Object.assign(globalThis, { FontFace: FakeFontFace })
if (!('fonts' in document)) {
  const fonts = new Set<unknown>()
  Object.defineProperty(document, 'fonts', {
    value: Object.assign(fonts, {
      check: () => true,
      load: () => Promise.resolve([]),
      ready: Promise.resolve(),
      status: 'loaded',
    }),
  })
}
