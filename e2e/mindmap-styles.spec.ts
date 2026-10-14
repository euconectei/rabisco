import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

// The style switch runs through `window.__rabiscoSetStyle`, which only exists in the E2E build
// (VITE_E2E=1). Running against production (E2E_BASE_URL) skips this spec.
test.skip(!!process.env.E2E_BASE_URL, 'the style switch runs against the E2E build only')

interface LiveElement {
  id: string
  type: string
  text?: string
  containerId?: string | null
  isDeleted?: boolean
  endBinding?: { elementId: string } | null
  customData?: { rabisco?: { kind: string; nodeId?: string; childId?: string } }
}

interface LiveScene {
  elements: LiveElement[]
  selection: string[]
}

async function openNewDrawing(page: Page): Promise<FakeDrive> {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  return drive
}

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

/** Reads the live scene via the E2E-only hook, without waiting for a save. */
async function scene(page: Page): Promise<LiveScene> {
  return page.evaluate(() => {
    const hook = (window as unknown as { __rabiscoScene: () => LiveScene }).__rabiscoScene
    return hook()
  })
}

async function setStyle(page: Page, style: string) {
  await page.evaluate((value) => {
    ;(window as unknown as { __rabiscoSetStyle: (style: string) => void }).__rabiscoSetStyle(value)
  }, style)
}

const nodes = (els: LiveElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'node')
const textOf = (els: LiveElement[], id: string) => els.find((e) => e.containerId === id)?.text
const underlines = (els: LiveElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'underline')
const arrows = (els: LiveElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'edge' && e.endBinding?.elementId)

const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'

test('boxes → lines → boxes keeps the texts, brings the arrows back, and undoes in one step', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')

  const before = await scene(page)
  const textsBefore = nodes(before.elements).map((n) => textOf(before.elements, n.id)).sort()
  expect(arrows(before.elements)).toHaveLength(2)

  // Boxes → lines: underlines appear, arrows disappear.
  await setStyle(page, 'lines')
  await expect.poll(async () => underlines((await scene(page)).elements).length).toBe(2)
  await expect.poll(async () => arrows((await scene(page)).elements).length).toBe(0)

  // Lines → boxes: arrows come back, underlines disappear.
  await setStyle(page, 'boxes')
  await expect.poll(async () => arrows((await scene(page)).elements).length).toBe(2)
  await expect.poll(async () => underlines((await scene(page)).elements).length).toBe(0)

  const after = await scene(page)
  expect(nodes(after.elements).map((n) => textOf(after.elements, n.id)).sort()).toEqual(textsBefore)

  // A single undo reverts the last style switch (back to lines).
  await page.keyboard.press(undoKey)
  await expect.poll(async () => underlines((await scene(page)).elements).length).toBe(2)
  await expect.poll(async () => arrows((await scene(page)).elements).length).toBe(0)

  expect(pageErrors).toEqual([])
})
