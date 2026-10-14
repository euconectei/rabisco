import type { Page } from '@playwright/test'

/**
 * Makes a modern Chromium behave like the Chrome 95 of an old tablet in the way that matters
 * here: the scripting APIs added after version 95 are not there. It runs before any script of
 * the page, so the app has to cope on its own. Syntax is covered separately (the build target).
 */
export async function pretendToBeChrome95(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const g = globalThis as unknown as Record<string, unknown>
    const drop = (owner: unknown, name: string) => {
      // Reflect.deleteProperty answers false (and does not throw) for a property it cannot remove.
      Reflect.deleteProperty(owner as object, name)
    }
    drop(g, 'structuredClone') // 98
    drop(URL, 'canParse') // 120
    drop(AbortSignal, 'timeout') // 103
    drop(AbortSignal, 'any') // 116
    drop(Object, 'groupBy') // 117
    drop(Map, 'groupBy') // 117
    drop(Promise, 'withResolvers') // 119
    drop(Array, 'fromAsync') // 121
    for (const name of ['findLast', 'findLastIndex', 'toSorted', 'toReversed', 'toSpliced', 'with']) {
      drop(Array.prototype, name) // 97 and 110
    }
    for (const name of ['isWellFormed', 'toWellFormed']) drop(String.prototype, name) // 111
    drop(ArrayBuffer.prototype, 'transfer') // 114
    drop(ArrayBuffer.prototype, 'transferToFixedLength') // 114
    for (const name of ['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom']) {
      drop(Set.prototype, name) // 122
    }
    ;(window as unknown as { __chrome95: boolean }).__chrome95 = true
  })
}
