import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

interface SavedElement {
  id: string
  type: string
  text?: string
  containerId?: string | null
  isDeleted?: boolean
  x: number
  y: number
  width: number
  height: number
  customData?: { rabisco?: { kind: string; parentId?: string | null; order?: number; childId?: string } }
}

async function openNewDrawing(page: Page): Promise<FakeDrive> {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  return drive
}

async function savedElements(drive: FakeDrive, page: Page): Promise<SavedElement[]> {
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible({ timeout: 10_000 })
  const file = [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!
  return (JSON.parse(file.content) as { elements: SavedElement[] }).elements.filter((e) => !e.isDeleted)
}

const nodes = (els: SavedElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'node')
const underlines = (els: SavedElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'underline')
const textOf = (els: SavedElement[], id: string) => els.find((e) => e.containerId === id)?.text
const byText = (els: SavedElement[], text: string) => nodes(els).find((n) => textOf(els, n.id) === text)
const centerOf = (e: SavedElement) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

const editor = (page: Page) => page.locator('textarea.excalidraw-wysiwyg')

async function typeNode(page: Page, text: string) {
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
}

async function createMap(page: Page) {
  await page.getByRole('button', { name: 'Mapa mental' }).click()
  await page.getByTestId('mindmap-placement').click({ position: { x: 640, y: 360 } })
}

const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'

test('Organize moves every branch to the right and Linhas underlines, undone in one step', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')

  const panel = page.getByRole('dialog', { name: 'Organizar' })

  // A node is selected (Neto): the Organize button is there and opens the panel.
  await page.getByRole('button', { name: 'Organizar' }).click()
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('radio', { name: 'Dois lados' })).toBeChecked()

  // Choose "Para a direita" (a click, not check(): the panel closes on choosing, so the radio is gone): the panel closes and every node lands to the right of the root.
  await panel.getByRole('radio', { name: 'Para a direita' }).click()
  await expect(panel).toHaveCount(0)
  await expect.poll(async () => {
    const els = await savedElements(drive, page)
    const root = byText(els, 'Raiz')!
    const child = byText(els, 'Filho')!
    const grandchild = byText(els, 'Neto')!
    return child.x > root.x + root.width - 1 && grandchild.x > root.x + root.width - 1
  }).toBe(true)

  // Choose "Linhas": underlines appear for the two non-root nodes.
  await page.getByRole('button', { name: 'Organizar' }).click()
  await expect(panel).toBeVisible()
  await panel.getByRole('radio', { name: 'Linhas' }).click()
  await expect(panel).toHaveCount(0)
  await expect.poll(async () => underlines(await savedElements(drive, page)).length).toBe(2)

  // A single undo reverts only the last switch (back to boxes); the right layout stays.
  await page.keyboard.press(undoKey)
  await expect.poll(async () => underlines(await savedElements(drive, page)).length).toBe(0)
  const undone = await savedElements(drive, page)
  expect(byText(undone, 'Filho')!.x).toBeGreaterThan(byText(undone, 'Raiz')!.x)

  expect(pageErrors).toEqual([])
})

test.describe('tablet', () => {
  test.use({ hasTouch: true })

  test('the touch toolbar Organize button opens the panel', async ({ page }) => {
    const drive = await openNewDrawing(page)
    await createMap(page)
    await typeNode(page, 'Raiz')
    await page.keyboard.press('Escape')
    const root = centerOf(nodes(await savedElements(drive, page))[0])
    await page.mouse.click(200, 650) // deselect
    await expect(page.getByRole('toolbar', { name: 'Ações do mapa mental' })).toHaveCount(0)
    await page.touchscreen.tap(root.x, root.y)
    const bar = page.getByRole('toolbar', { name: 'Ações do mapa mental' })
    await expect(bar).toBeVisible()
    await bar.getByRole('button', { name: 'Organizar' }).tap()
    await expect(page.getByRole('dialog', { name: 'Organizar' })).toBeVisible()
  })
})
