import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

const saved = (page: Page) => page.getByRole('status').filter({ hasText: /^Salvo/ })

async function typeOnCanvas(page: Page, text: string) {
  await page.mouse.dblclick(600, 350)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
}

/** The scenes stored in this browser, read straight from IndexedDB. */
function storedScenes(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('rabisco-local')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const all = open.result.transaction('content').objectStore('content').getAll()
          all.onsuccess = () => resolve((all.result as Array<{ content: string }>).map((row) => row.content))
          all.onerror = () => reject(all.error)
        }
      }),
  )
}

/** Makes a named drawing without an account; the first call also enters the local mode. */
async function localDrawing(page: Page, name: string) {
  await page.goto('/app')
  const enter = page.getByRole('button', { name: 'Usar sem entrar' })
  if (await enter.isVisible()) await enter.click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  const title = page.getByRole('textbox', { name: 'Nome do desenho' })
  await title.fill(name)
  await page.keyboard.press('Enter')
  await typeOnCanvas(page, `Conteúdo ${name}`)
  await expect.poll(async () => (await storedScenes(page)).join('')).toContain(`Conteúdo ${name}`)
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  await page.goto('/app')
  await expect(page.getByRole('list', { name: 'Seus desenhos' }).getByRole('link', { name })).toBeVisible()
}

async function signInFromLocalMode(page: Page) {
  await page.getByRole('complementary', { name: 'Aviso sobre o modo local' }).getByRole('button', { name: 'Entrar' }).click()
}

test('signing in with local drawings offers to move them, and moving copies them to the Drive and clears them here', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await localDrawing(page, 'Alfa')
  await localDrawing(page, 'Beta')

  await signInFromLocalMode(page)
  await expect(page.getByText('Mover seus 2 desenhos locais para o Drive?')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('rabisco.mode'))).not.toBe('local')
  await expect(page.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir do Drive' })).toBeVisible()

  await page.getByRole('button', { name: 'Mover para o Drive' }).click()
  await expect(page.getByText('Os 2 desenhos foram movidos para o Drive.')).toBeVisible()

  expect(drive.byName('Alfa.excalidraw')?.content).toContain('Conteúdo Alfa')
  expect(drive.byName('Beta.excalidraw')?.content).toContain('Conteúdo Beta')
  const folder = drive.byName('Rabisco')!
  expect(drive.byName('Alfa.excalidraw')!.parents).toContain(folder.id)
  expect(await storedScenes(page)).toEqual([])

  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  const list = page.getByRole('list', { name: 'Seus desenhos' })
  await expect(list.getByRole('link', { name: /Alfa/ })).toBeVisible()
  await expect(list.getByRole('link', { name: /Beta/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Desenhos locais' })).toHaveCount(0)
})

test('with one local drawing the offer is in the singular', async ({ page }) => {
  await installFakeGoogle(page)
  await localDrawing(page, 'Unico')
  await signInFromLocalMode(page)
  await expect(page.getByText('Mover seu desenho local para o Drive?')).toBeVisible()
})

test('declining keeps everything here, does not ask again, and leaves a quiet link to the local drawings', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await localDrawing(page, 'Alfa')
  await signInFromLocalMode(page)
  await page.getByRole('button', { name: 'Agora não' }).click()
  await expect(page.getByText('Mover seu desenho local para o Drive?')).toHaveCount(0)
  expect(drive.byName('Alfa.excalidraw')).toBeUndefined()
  expect((await storedScenes(page)).join('')).toContain('Conteúdo Alfa')

  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Meus rabiscos|Seu primeiro rabisco/ })).toBeVisible()
  await expect(page.getByText('Mover seu desenho local para o Drive?')).toHaveCount(0)

  await page.getByRole('link', { name: 'Desenhos locais' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Desenhos locais' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Seus desenhos' }).getByRole('link', { name: /Alfa/ })).toBeVisible()

  await page.getByRole('button', { name: 'Mover todos para o Drive' }).click()
  await expect(page.getByText('Seu desenho foi movido para o Drive.')).toBeVisible()
  expect(drive.byName('Alfa.excalidraw')?.content).toContain('Conteúdo Alfa')
  expect(await storedScenes(page)).toEqual([])
})

test('when one upload fails the others still move, the failed one stays intact here, and "Try again" finishes it', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await localDrawing(page, 'Alfa')
  await localDrawing(page, 'Beta')
  await localDrawing(page, 'Gama')
  await signInFromLocalMode(page)
  await expect(page.getByText('Mover seus 3 desenhos locais para o Drive?')).toBeVisible()

  // The most recent drawing goes first, so the second upload is Beta's.
  drive.createFailures = [null, 400, null]
  await page.getByRole('button', { name: 'Mover para o Drive' }).click()
  await expect(page.getByRole('alert')).toContainText('Movidos: 2. Com falha: 1.')

  expect(drive.byName('Gama.excalidraw')?.content).toContain('Conteúdo Gama')
  expect(drive.byName('Alfa.excalidraw')?.content).toContain('Conteúdo Alfa')
  expect(drive.byName('Beta.excalidraw')).toBeUndefined()
  const left = await storedScenes(page)
  expect(left).toHaveLength(1)
  expect(left[0]).toContain('Conteúdo Beta')

  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByText('Os 3 desenhos foram movidos para o Drive.')).toBeVisible()
  expect(drive.byName('Beta.excalidraw')?.content).toContain('Conteúdo Beta')
  expect(await storedScenes(page)).toEqual([])
})
