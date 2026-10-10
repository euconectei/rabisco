import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

// The live branch drag relies on `window.__rabiscoScene` and `window.__rabiscoSetLayout`, which only
// exist in the E2E build (VITE_E2E=1). Running against production (E2E_BASE_URL) skips this spec.
test.skip(!!process.env.E2E_BASE_URL, 'the live branch drag runs against the E2E build only')

interface LiveElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  text?: string
  containerId?: string | null
  isDeleted?: boolean
  points?: [number, number][]
  customData?: { rabisco?: { kind: string; parentId?: string | null; order?: number; nodeId?: string; childId?: string } }
}

interface LiveScene {
  elements: LiveElement[]
  selection: string[]
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

/** Reads the live scene (elements + selection) via the E2E-only hook, without waiting for a save. */
async function scene(page: Page): Promise<LiveScene> {
  return page.evaluate(() => {
    const hook = (window as unknown as { __rabiscoScene: () => LiveScene }).__rabiscoScene
    return hook()
  })
}

/** Writes the layout to every map's root via the E2E-only hook (the "Organizar" control comes later). */
async function setLayout(page: Page, layout: string) {
  await page.evaluate((value) => {
    ;(window as unknown as { __rabiscoSetLayout: (layout: string) => void }).__rabiscoSetLayout(value)
  }, layout)
}

/** Writes the style to every map's root and re-lays out each map via the E2E-only hook. */
async function setStyle(page: Page, style: string) {
  await page.evaluate((value) => {
    ;(window as unknown as { __rabiscoSetStyle: (style: string) => void }).__rabiscoSetStyle(value)
  }, style)
}

const underlineOf = (els: LiveElement[], nodeId: string) =>
  els.find((e) => e.customData?.rabisco?.kind === 'underline' && e.customData.rabisco.nodeId === nodeId)
const edgeOf = (els: LiveElement[], childId: string) =>
  els.find((e) => e.customData?.rabisco?.kind === 'edge' && e.customData.rabisco.childId === childId)

const nodes = (els: LiveElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'node')
const textOf = (els: LiveElement[], id: string) => els.find((e) => e.containerId === id)?.text
const byText = (els: LiveElement[], text: string) => nodes(els).find((n) => textOf(els, n.id) === text)
const byId = (els: LiveElement[], id: string) => els.find((e) => e.id === id)
const centerOf = (e: LiveElement) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'

test('in free layout, dragging a node moves its whole branch live, undone in one shortcut', async ({ page }) => {
  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')

  // Turn the map's layout to free (the "Organizar" control only lands in a later task).
  await setLayout(page, 'free')

  const before = await scene(page)
  const filho = byText(before.elements, 'Filho')!
  const neto = byText(before.elements, 'Neto')!
  const from = centerOf(filho)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 160, from.y + 90, { steps: 12 })

  // In the middle of the gesture, before mouse.up, the grandchild already moved with the node.
  const mid = await scene(page)
  const midFilho = byId(mid.elements, filho.id)!
  const midNeto = byId(mid.elements, neto.id)!
  expect(midFilho.x - filho.x).toBeGreaterThan(10)
  expect(midFilho.y - filho.y).toBeGreaterThan(10)
  expect(midNeto.x - neto.x).toBeCloseTo(midFilho.x - filho.x, 0)
  expect(midNeto.y - neto.y).toBeCloseTo(midFilho.y - filho.y, 0)

  await page.mouse.up()

  // On release, the selection is just the dragged node (not the whole branch).
  await expect.poll(async () => (await scene(page)).selection).toEqual([filho.id])

  // A single undo puts the whole branch back where it was.
  await page.keyboard.press(undoKey)
  await expect
    .poll(async () => {
      const els = (await scene(page)).elements
      const f = byId(els, filho.id)!
      const n = byId(els, neto.id)!
      return (
        Math.abs(f.x - filho.x) < 1 &&
        Math.abs(f.y - filho.y) < 1 &&
        Math.abs(n.x - neto.x) < 1 &&
        Math.abs(n.y - neto.y) < 1
      )
    })
    .toBe(true)
})

test('in free layout, dropping a branch on empty canvas keeps it where it fell', async ({ page }) => {
  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')

  await setLayout(page, 'free')

  const before = await scene(page)
  const raiz = byText(before.elements, 'Raiz')!
  const filho = byText(before.elements, 'Filho')!
  const neto = byText(before.elements, 'Neto')!
  const from = centerOf(filho)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 240, { steps: 12 })
  await page.mouse.up()

  // After the save, the branch must still be where it was dropped (the heal does not undo it).
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()

  const after = await scene(page)
  const droppedFilho = byId(after.elements, filho.id)!
  const droppedNeto = byId(after.elements, neto.id)!
  expect(droppedFilho.y - filho.y).toBeGreaterThan(100)
  expect(droppedNeto.y - neto.y).toBeCloseTo(droppedFilho.y - filho.y, 0)
  expect(droppedFilho.customData?.rabisco?.parentId).toBe(raiz.id)
})

test('in free layout, a click without dragging selects just the node, so Tab still adds a child', async ({ page }) => {
  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')
  await setLayout(page, 'free')

  const before = await scene(page)
  const filho = byText(before.elements, 'Filho')!
  const from = centerOf(filho)
  await page.mouse.click(from.x, from.y)
  await expect.poll(async () => (await scene(page)).selection).toEqual([filho.id])

  await page.keyboard.press('Tab')
  await typeNode(page, 'Outro')
  const after = await scene(page)
  expect(byText(after.elements, 'Outro')).toBeDefined()
})

test('in lines style, dragging a branch live moves its underlines and re-anchors the parent link', async ({ page }) => {
  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Escape')

  await setLayout(page, 'free')
  await setStyle(page, 'lines')

  const before = await scene(page)
  const filho = byText(before.elements, 'Filho')!
  const neto = byText(before.elements, 'Neto')!
  const filhoUnderline = underlineOf(before.elements, filho.id)!
  const netoUnderline = underlineOf(before.elements, neto.id)!
  const parentLink = edgeOf(before.elements, filho.id)!
  const from = centerOf(filho)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 160, from.y + 90, { steps: 12 })

  // Mid-gesture, before mouse.up, the underlines moved with their nodes and the parent link still
  // ends at the start of the dragged node's underline.
  const mid = await scene(page)
  const midFilho = byId(mid.elements, filho.id)!
  const midNeto = byId(mid.elements, neto.id)!
  const midFilhoUnderline = byId(mid.elements, filhoUnderline.id)!
  const midNetoUnderline = byId(mid.elements, netoUnderline.id)!
  const midParentLink = byId(mid.elements, parentLink.id)!

  expect(midFilhoUnderline.x - filhoUnderline.x).toBeCloseTo(midFilho.x - filho.x, 0)
  expect(midFilhoUnderline.y - filhoUnderline.y).toBeCloseTo(midFilho.y - filho.y, 0)
  expect(midNetoUnderline.x - netoUnderline.x).toBeCloseTo(midNeto.x - neto.x, 0)
  expect(midNetoUnderline.y - netoUnderline.y).toBeCloseTo(midNeto.y - neto.y, 0)

  const last = midParentLink.points![midParentLink.points!.length - 1]
  const endX = midParentLink.x + last[0]
  const endY = midParentLink.y + last[1]
  expect(Math.abs(endX - midFilhoUnderline.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(endY - midFilhoUnderline.y)).toBeLessThanOrEqual(2)

  await page.mouse.up()

  // A single undo puts the whole branch (and its decorations) back where it was.
  await page.keyboard.press(undoKey)
  await expect
    .poll(async () => {
      const els = (await scene(page)).elements
      const f = byId(els, filho.id)!
      const n = byId(els, neto.id)!
      const fu = byId(els, filhoUnderline.id)
      return (
        fu != null &&
        Math.abs(f.x - filho.x) < 1 &&
        Math.abs(f.y - filho.y) < 1 &&
        Math.abs(n.x - neto.x) < 1 &&
        Math.abs(n.y - neto.y) < 1 &&
        Math.abs(fu.x - filhoUnderline.x) < 1
      )
    })
    .toBe(true)
})

test('lines style, to the right: screenshot for visual review', async ({ page }) => {
  await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'A')
  await page.keyboard.press('Enter')
  await typeNode(page, 'B')
  await page.keyboard.press('Enter')
  await typeNode(page, 'C')
  await page.keyboard.press('Tab')
  await typeNode(page, 'A1')
  await page.keyboard.press('Enter')
  await typeNode(page, 'A2')
  await page.keyboard.press('Escape')

  await setStyle(page, 'lines')
  await setLayout(page, 'right')

  await expect
    .poll(async () => (await scene(page)).elements.filter((e) => e.customData?.rabisco?.kind === 'underline').length)
    .toBe(5)
  // Fit the whole map on screen before capturing it.
  await page.keyboard.press('Shift+1')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/lines-style.png' })
})
