import { expect, test, type Page } from '@playwright/test'
import { pretendToBeChrome95 } from './fakes/chrome95'
import { installFakeGoogle } from './fakes/google'

// The old tablet (Chrome 95) is best effort: these tests make a modern Chromium lack every
// scripting API that came after 95 and check that the main paths still work.
test.use({ locale: 'pt-BR' })

async function open(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installFakeGoogle(page)
  await pretendToBeChrome95(page)
  return errors
}

test('the pretend is real: the new APIs are gone before the app runs', async ({ page }) => {
  await open(page)
  await page.goto('/')
  const gone = await page.evaluate(() => ({
    structuredClone: typeof (globalThis as { structuredClone?: unknown }).structuredClone,
    canParse: typeof (URL as { canParse?: unknown }).canParse,
    findLast: typeof (Array.prototype as { findLast?: unknown }).findLast,
  }))
  // The app installs its own structuredClone and URL.canParse when they are missing.
  expect(gone.findLast).toBe('undefined')
  expect(gone.structuredClone).toBe('function')
  expect(gone.canParse).toBe('function')
})

test('the local editor opens, draws, saves and reopens', async ({ page }) => {
  const errors = await open(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: /Criar o primeiro desenho|Novo desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await page.mouse.dblclick(600, 300)
  await page.keyboard.type('Tablet antigo')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status').filter({ hasText: /Salvo/ })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __rabiscoScene?: () => { elements: Array<{ text?: string }> } }).__rabiscoScene?.().elements.map((e) => e.text).filter(Boolean)))
    .toContain('Tablet antigo')
  expect(errors).toEqual([])
})

test('a Mermaid diagram becomes a drawing', async ({ page }) => {
  const errors = await open(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await page.getByRole('textbox').first().fill('flowchart TD\n  A[Início] --> B{Pagamento ok?}\n  B -->|sim| C[Fim]')
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})

test('a mind map can be placed', async ({ page }) => {
  const errors = await open(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: /Criar o primeiro desenho|Novo desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await page.getByRole('button', { name: 'Mapa mental' }).click()
  await page.mouse.click(600, 350)
  await page.waitForTimeout(800)
  expect(errors).toEqual([])
})

test('an ER diagram gets an answer without any page error', async ({ page }) => {
  const errors = await open(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await page.getByRole('textbox').first().fill('erDiagram\n  CLIENTE ||--o{ PEDIDO : faz\n  PEDIDO ||--|{ ITEM : contem')
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  // Either it converts, or it says the diagram uses features that cannot be converted yet.
  // It must never say it did not understand a valid diagram, and nothing may throw.
  const dialog = page.getByRole('dialog')
  const converted = page.locator('.excalidraw')
  await expect(dialog.getByRole('alert').or(converted)).toBeVisible({ timeout: 20_000 })
  if (await dialog.getByRole('alert').isVisible()) {
    await expect(dialog.getByRole('alert')).not.toContainText('não entendeu')
  }
  expect(errors).toEqual([])
})
