import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

// "Saved" in the Google mode, "Saved in this browser" in the local one: both start the same way.
const saved = (page: Page) => page.getByRole('status').filter({ hasText: /^Salvo/ })

const SECRET = 'Texto secreto do desenho local'

/** Every request the page makes, with its body, so tests can prove nothing left the browser. */
function recordRequests(page: Page) {
  const seen: Array<{ url: string; body: string }> = []
  page.on('request', (request) => seen.push({ url: request.url(), body: request.postData() ?? '' }))
  return seen
}

/** The entry screen may warm up Google's sign-in script before the click; the local mode itself must not talk to Google. */
async function enterLocalMode(page: Page, seen: Array<unknown> = []) {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await expect(page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ })).toBeVisible()
  seen.length = 0
}

async function createDrawing(page: Page, seen: Array<unknown> = []) {
  await enterLocalMode(page, seen)
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
}

async function typeOnCanvas(page: Page, text: string) {
  await page.mouse.dblclick(600, 350)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
}

/** Rows of one store of the local database, read straight from IndexedDB. */
function storedRows(page: Page, store: 'meta' | 'content'): Promise<Array<Record<string, string>>> {
  return page.evaluate(
    (name) =>
      new Promise<Array<Record<string, string>>>((resolve, reject) => {
        const open = indexedDB.open('rabisco-local')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const all = open.result.transaction(name).objectStore(name).getAll()
          all.onsuccess = () => resolve(all.result as Array<Record<string, string>>)
          all.onerror = () => reject(all.error)
        }
      }),
    store,
  )
}

const storedScenes = async (page: Page) => (await storedRows(page, 'content')).map((row) => row.content)
const storedNames = async (page: Page) => (await storedRows(page, 'meta')).map((row) => row.name)

/** Back to the files page through the editor's main menu. */
async function backToFiles(page: Page) {
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Meus arquivos').click()
}

test('"Use without signing in" opens the files in the local mode and remembers it', async ({ page }) => {
  await enterLocalMode(page)
  await expect(page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('rabisco.mode'))).toBe('local')
})

test('creates and edits a drawing without an account, and a reload keeps it', async ({ page }) => {
  const seen = recordRequests(page)
  await createDrawing(page, seen)
  await typeOnCanvas(page, SECRET)
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  await expect.poll(async () => (await storedScenes(page)).join('')).toContain(SECRET)

  await page.reload()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(saved(page)).toBeVisible()
  expect((await storedScenes(page)).join('')).toContain(SECRET)

  await backToFiles(page)
  await expect(page.getByRole('list', { name: 'Seus desenhos' }).getByRole('link', { name: /Sem título/ })).toBeVisible()
  expect(seen.some((r) => /googleapis\.com|accounts\.google\.com/.test(r.url))).toBe(false)
})

test('nothing leaves the browser: no request mentions the drawing or reaches Google', async ({ page }) => {
  const seen = recordRequests(page)
  await createDrawing(page, seen)
  await typeOnCanvas(page, SECRET)
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  await expect.poll(async () => (await storedScenes(page)).join('')).toContain(SECRET)
  await page.reload()
  await expect(page.locator('.excalidraw')).toBeVisible()

  expect(seen.filter((r) => /googleapis\.com|accounts\.google\.com/.test(r.url))).toEqual([])
  const encoded = encodeURIComponent(SECRET)
  for (const request of seen) {
    expect(request.url).not.toContain(encoded)
    expect(request.url).not.toContain(SECRET)
    expect(request.body).not.toContain(SECRET)
    expect(request.body).not.toContain(encoded)
  }
})

test('renaming changes the list and the editor and survives a reload, with a single .excalidraw', async ({ page }) => {
  await createDrawing(page)
  const title = page.getByRole('textbox', { name: 'Nome do desenho' })
  await title.fill('Plano local')
  await page.keyboard.press('Enter')
  await expect.poll(() => storedNames(page)).toEqual(['Plano local.excalidraw'])

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Nome do desenho' })).toHaveValue('Plano local')
  await backToFiles(page)
  const list = page.getByRole('list', { name: 'Seus desenhos' })
  await expect(list.getByRole('link', { name: /Plano local/ })).toBeVisible()
  await expect(list).not.toContainText('.excalidraw')
})

test('clearing the site data removes the drawings and the local mode works again', async ({ page }) => {
  await createDrawing(page)
  await typeOnCanvas(page, SECRET)
  await expect.poll(async () => (await storedScenes(page)).join('')).toContain(SECRET)
  await page.goto('/app')

  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('rabisco-local')
      request.onsuccess = request.onerror = request.onblocked = () => resolve()
    })
  })
  await page.reload()

  await expect(page.getByRole('button', { name: 'Usar sem entrar' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await expect(page.getByRole('button', { name: /Criar o primeiro desenho/ })).toBeVisible()
  expect(await storedScenes(page)).toEqual([])
})

test('a failed write to IndexedDB shows "could not save", keeps the text, and recovers', async ({ page }) => {
  // Refuses writes to the content store while the flag is up, like a full disk or a private window.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'content' && (window as unknown as { __failWrites?: boolean }).__failWrites) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
      return put.apply(this, args)
    }
  })
  await createDrawing(page)

  await page.evaluate(() => ((window as unknown as { __failWrites?: boolean }).__failWrites = true))
  await typeOnCanvas(page, 'Primeiro texto')
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível salvar' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.excalidraw')).toBeVisible()
  expect((await storedScenes(page)).join('')).not.toContain('Primeiro texto')

  await page.evaluate(() => ((window as unknown as { __failWrites?: boolean }).__failWrites = false))
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(saved(page)).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await storedScenes(page)).join('')).toContain('Primeiro texto')

  await backToFiles(page)
  await expect(page.getByRole('list', { name: 'Seus desenhos' }).getByRole('link', { name: /Sem título/ })).toBeVisible()
})

test('a local drawing keeps saving while the browser is offline', async ({ page, context }) => {
  await createDrawing(page)
  await context.setOffline(true)
  await typeOnCanvas(page, 'Escrito sem rede')
  await expect.poll(async () => (await storedScenes(page)).join(''), { timeout: 15_000 }).toContain('Escrito sem rede')
  await expect(saved(page)).toBeVisible({ timeout: 15_000 })
  await context.setOffline(false)
})

test('visiting the home page and the sign-in screen does not create the local database', async ({ page }) => {
  await page.goto('/')
  await page.goto('/app')
  await expect(page.getByRole('button', { name: 'Usar sem entrar' })).toBeVisible()
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name))
  expect(names).not.toContain('rabisco-local')
})

test('signed in, a stale local link says "not found" and does not create the local database', async ({ page }) => {
  await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await expect(page.getByRole('button', { name: /Criar o primeiro desenho/ })).toBeVisible()
  await page.goto('/edit/local-xyz')
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.getByText('Não encontramos este desenho neste navegador.')).toBeVisible()
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name))
  expect(names).not.toContain('rabisco-local')
})

test('signing in with Google from the local mode leaves it and lists the Drive again', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  drive.add({ name: 'Do Drive.excalidraw', content: '{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}' })
  await enterLocalMode(page)
  await expect(page.getByRole('list', { name: 'Seus desenhos' })).toHaveCount(0)

  await page.getByRole('complementary', { name: 'Aviso sobre o modo local' }).getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('list', { name: 'Seus desenhos' }).getByRole('link', { name: /Do Drive/ })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('rabisco.mode'))).toBeNull()
})
