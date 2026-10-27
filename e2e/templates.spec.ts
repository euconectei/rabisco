import { expect, test } from '@playwright/test'
import { installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

test('a template opens in the editor without signing in', async ({ page }) => {
  await installFakeGoogle(page)
  const events: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/event') events.push(request.postData() ?? '')
  })
  await page.goto('/modelos/revolucao-francesa')
  await expect(page.getByRole('heading', { level: 1, name: 'Mapa mental da Revolução Francesa' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar este modelo' }).first().click()
  await expect(page).toHaveURL(/\/edit\/local-/, { timeout: 15_000 })
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: /^Salvo/ })).toBeVisible({ timeout: 10_000 })
  // Counted once, anonymously: no drawing id, no content.
  await expect.poll(() => events.length).toBe(1)
  expect(JSON.parse(events[0])).toEqual({ type: 'drawing_created', source: 'template', template: 'revolucao-francesa', mode: 'local', lang: 'pt-BR' })
  expect(events[0]).not.toContain('local-')
})

test('a flowchart template opens as an editable flowchart', async ({ page }) => {
  await installFakeGoogle(page)
  await page.goto('/en/templates/yes-no-flowchart')
  await page.getByRole('button', { name: 'Use this template' }).first().click()
  await expect(page).toHaveURL(/\/edit\/local-/, { timeout: 15_000 })
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByText('Could not create the drawing.')).toHaveCount(0)
  // The canvas draws text as pixels: read the drawing back from this browser's storage instead.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve, reject) => {
            const open = indexedDB.open('rabisco-local')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const all = open.result.transaction('content').objectStore('content').getAll()
              all.onsuccess = () => resolve(JSON.stringify(all.result))
              all.onerror = () => reject(all.error)
            }
          }),
      ),
    )
    .toContain('Is the condition met?')
})

test('the Portuguese template page stays in Portuguese for an English browser', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' })
  const page = await context.newPage()
  await page.goto('/modelos/revolucao-francesa')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('button', { name: 'Usar este modelo' }).first()).toBeVisible()
  await context.close()
})
