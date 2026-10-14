// Small stand-ins for scripting APIs that older browsers lack. Each one is installed only when
// the browser does not have it, so modern browsers keep their own. They exist for the old
// tablet (Chrome 95): structuredClone arrived in Chrome 98 and URL.canParse in Chrome 120, and
// Excalidraw and the Mermaid libraries call them.

function dataCloneError(what: string): Error {
  const message = `${what} could not be cloned.`
  return typeof DOMException === 'function' ? new DOMException(message, 'DataCloneError') : new Error(message)
}

/** structuredClone for the values the app and its libraries pass: plain data, dates, maps, sets, typed arrays. */
export function cloneStructured<T>(value: T): T {
  const seen = new WeakMap<object, unknown>()
  const copy = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      if (typeof input === 'function') throw dataCloneError('A function')
      if (typeof input === 'symbol') throw dataCloneError('A symbol')
      return input
    }
    if (seen.has(input)) return seen.get(input)
    if (input instanceof Date) return new Date(input.getTime())
    if (input instanceof RegExp) return Reflect.construct(RegExp, [input.source, input.flags])
    if (input instanceof ArrayBuffer) return input.slice(0)
    if (ArrayBuffer.isView(input)) {
      const { buffer, byteOffset, byteLength } = input
      const bytes = buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer
      if (input instanceof DataView) return new DataView(bytes)
      const Typed = input.constructor as new (buffer: ArrayBuffer) => unknown
      return new Typed(bytes)
    }
    if (input instanceof Map) {
      const out = new Map<unknown, unknown>()
      seen.set(input, out)
      input.forEach((v, k) => out.set(copy(k), copy(v)))
      return out
    }
    if (input instanceof Set) {
      const out = new Set<unknown>()
      seen.set(input, out)
      input.forEach((v) => out.add(copy(v)))
      return out
    }
    if (Array.isArray(input)) {
      const out: unknown[] = []
      seen.set(input, out)
      input.forEach((v) => out.push(copy(v)))
      out.length = input.length
      return out
    }
    if (input instanceof Error) {
      const out = new (input.constructor as ErrorConstructor)(input.message)
      seen.set(input, out)
      return out
    }
    const out: Record<string, unknown> = {}
    seen.set(input, out)
    // defineProperty, not assignment: an own key called "__proto__" must stay a plain key.
    for (const [key, value] of Object.entries(input)) {
      Object.defineProperty(out, key, { value: copy(value), enumerable: true, writable: true, configurable: true })
    }
    return out
  }
  return copy(value) as T
}

export function installPolyfills(scope: typeof globalThis = globalThis): void {
  if (typeof scope.structuredClone !== 'function') {
    scope.structuredClone = (value: unknown) => cloneStructured(value)
  }
  if (typeof scope.URL === 'function' && typeof (scope.URL as { canParse?: unknown }).canParse !== 'function') {
    ;(scope.URL as unknown as { canParse: (url: string, base?: string) => boolean }).canParse = (url, base) => {
      try {
        new scope.URL(url, base)
        return true
      } catch {
        return false
      }
    }
  }
}

installPolyfills()
