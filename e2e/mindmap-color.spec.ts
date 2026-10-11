import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

interface SavedElement {
  id: string
  text?: string
  containerId?: string | null
  isDeleted?: boolean
  strokeColor: string
  customData?: { rabisco?: { kind: string; colorAuto?: boolean } }
}

const editor = (page: Page) => page.locator('textarea.excalidraw-wysiwyg')

async function typeNode(page: Page, text: string) {
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
}

async function saved(drive: FakeDrive, page: Page): Promise<SavedElement[]> {
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible({ timeout: 10_000 })
  const file = [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!
  return (JSON.parse(file.content) as { elements: SavedElement[] }).elements.filter((e) => !e.isDeleted)
}

const nodeWithText = (els: SavedElement[], text: string) => {
  const label = els.find((e) => e.text === text)!
  return els.find((e) => e.id === label.containerId)!
}

test('a color picked by hand in the properties panel survives adding more nodes', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await page.getByRole('button', { name: 'Mapa mental' }).click()
  await page.getByTestId('mindmap-placement').click({ position: { x: 640, y: 360 } })
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'A')

  // A is still selected: paint its stroke red with Excalidraw's own color picker.
  await page.getByTestId('color-top-pick-#e03131').first().click()
  await expect.poll(async () => nodeWithText(await saved(drive, page), 'A').strokeColor).toBe('#e03131')

  // Back to the root (a click: the picker keeps the focus and takes the arrow keys) and add another
  // branch, so the map is re-laid out and recolored.
  await page.mouse.click(640, 360)
  await page.keyboard.press('Tab')
  await typeNode(page, 'B')

  await expect.poll(async () => nodeWithText(await saved(drive, page), 'B').strokeColor).not.toBe('#e03131')
  const elements = await saved(drive, page)
  expect(nodeWithText(elements, 'A').strokeColor).toBe('#e03131')
  expect(nodeWithText(elements, 'A').customData?.rabisco?.colorAuto).toBe(false)
})
