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

interface Box {
  x: number
  y: number
  width: number
  height: number
}

const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const SIZES = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]

for (const size of SIZES) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`in the editor at ${size.width}px (${colorScheme}) the notice is readable, clear of the footer and dismissable`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize(size)
      await openLocalEditor(page)
      const notice = page.getByRole('complementary', { name: 'Aviso sobre o modo local' })
      await expect(notice).toBeVisible()
      await page.waitForTimeout(500)

      const box = (await notice.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(size.width)
      expect(box.y + box.height).toBeLessThanOrEqual(size.height)

      // Whatever of Excalidraw's chrome and ours exists at this size must not be crossed by the notice.
      const others = ['.ad-slot', '.zoom-actions', '.undo-redo-buttons', '[data-testid="main-menu-trigger"]', '.save-status', '.App-toolbar', '.mobile-misc-tools-container']
      let checked = 0
      for (const selector of others) {
        const other = page.locator(selector).first()
        if ((await other.count()) === 0) continue
        const otherBox = await other.boundingBox()
        if (!otherBox) continue
        checked += 1
        expect(overlap(box, otherBox), `${selector} is crossed by the notice`).toBe(false)
      }
      expect(checked).toBeGreaterThan(2)
      // The bottom bar of the narrow layout is one tall transparent container: look at its visible parts.
      if (size.width <= 640) {
        const bar = await page.locator('.App-bottom-bar .Island, .App-bottom-bar .mobile-misc-tools-container, .App-bottom-bar .App-toolbar').evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect()).filter((r) => r.height > 0 && r.height < 200).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
        )
        for (const part of bar) expect(overlap(box, part)).toBe(false)
      }

      await page.screenshot({ path: info.outputPath(`notice-${size.width}-${colorScheme}.png`) })
      // A real click, no force: it fails when something covers the button.
      await page.getByRole('button', { name: 'Dispensar o aviso' }).click()
      await expect(notice).toHaveCount(0)
    })
  }
}
