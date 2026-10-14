import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'pt-BR' })

async function openLocalEditor(page: Page) {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^Salvo/ })).toBeVisible({ timeout: 10_000 })
}

for (const width of [390, 1280]) {
  test(`at ${width}px the local notice does not cover the main menu`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openLocalEditor(page)
    await expect(page.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toBeVisible()

    await page.getByTestId('main-menu-trigger').click()
    // A real click, not a forced one: it fails if something sits on top of the item.
    await page.getByText('Inserir Mermaid…').click()
    await expect(page.getByRole('dialog', { name: 'Inserir Mermaid' })).toBeVisible()
  })
}

test('the notice can be dismissed and stays dismissed after a reload', async ({ page }) => {
  await openLocalEditor(page)
  await page.getByRole('button', { name: 'Dispensar o aviso' }).click()
  await expect(page.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Aviso sobre o modo local' })).toHaveCount(0)
})
