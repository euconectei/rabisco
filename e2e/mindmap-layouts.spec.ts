import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

// These specs read the live scene and drive manual colors through the E2E-only hooks
// (`__rabiscoScene`, `__rabiscoSetColor`), so they run against the E2E build only.
test.skip(!!process.env.E2E_BASE_URL, 'layout and color round trips run against the E2E build only')

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
  customData?: { rabisco?: { kind: string; parentId?: string | null; nodeId?: string; childId?: string } }
}

interface LiveScene {
  elements: LiveElement[]
  selection: string[]
  scrollX: number
  scrollY: number
  zoom: number
  offsetLeft: number
  offsetTop: number
}

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
  strokeColor: string
  backgroundColor: string
  customData?: {
    rabisco?: {
      kind: string
      parentId?: string | null
      order?: number
      childId?: string
      side?: 'left' | 'right' | null
      layout?: string
      style?: string
    }
  }
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

/** Reads the live scene (elements + selection + viewport) via the E2E-only hook. */
async function scene(page: Page): Promise<LiveScene> {
  return page.evaluate(() => {
    const hook = (window as unknown as { __rabiscoScene: () => LiveScene }).__rabiscoScene
    return hook()
  })
}

/** Picks a manual color on a node the way a user would (colorAuto: false). */
async function setColor(page: Page, nodeId: string, strokeColor: string, backgroundColor: string) {
  await page.evaluate(
    ({ nodeId, strokeColor, backgroundColor }) => {
      const hook = (window as unknown as { __rabiscoSetColor: (id: string, stroke: string, background: string) => void }).__rabiscoSetColor
      hook(nodeId, strokeColor, backgroundColor)
    },
    { nodeId, strokeColor, backgroundColor },
  )
}

const fileOf = (drive: FakeDrive) => [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!

async function savedElements(drive: FakeDrive, page: Page): Promise<SavedElement[]> {
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible({ timeout: 10_000 })
  const file = fileOf(drive)
  return (JSON.parse(file.content) as { elements: SavedElement[] }).elements.filter((e) => !e.isDeleted)
}

/** Opens the "Organizar" panel and picks one radio option (the panel closes on choosing). */
async function choose(page: Page, radio: string) {
  await page.getByRole('button', { name: 'Organizar' }).click()
  const panel = page.getByRole('dialog', { name: 'Organizar' })
  await expect(panel).toBeVisible()
  await panel.getByRole('radio', { name: radio }).click()
  await expect(panel).toHaveCount(0)
}

type NodeLike = { id: string; text?: string; containerId?: string | null; customData?: { rabisco?: { kind?: string } } }
const nodes = <T extends NodeLike>(els: T[]) => els.filter((e) => e.customData?.rabisco?.kind === 'node')
const textOf = <T extends NodeLike>(els: T[], id: string) => els.find((e) => e.containerId === id)?.text
const byText = <T extends NodeLike>(els: T[], text: string) => nodes(els).find((n) => textOf(els, n.id) === text)
const byId = <T extends { id: string }>(els: T[], id: string) => els.find((e) => e.id === id)
const centerOf = (e: { x: number; y: number; width: number; height: number }) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

const dataOf = (e: SavedElement) => e.customData!.rabisco!
const rootOf = (els: SavedElement[]) =>
  els.find((e) => e.customData?.rabisco?.kind === 'node' && e.customData.rabisco.parentId === null)!.customData!.rabisco!

/** Clicks a scene point, converting to viewport coordinates through the hook's scroll/zoom/offset. */
async function clickScenePoint(page: Page, x: number, y: number) {
  const s = await scene(page)
  await page.mouse.click((x + s.scrollX) * s.zoom + s.offsetLeft, (y + s.scrollY) * s.zoom + s.offsetTop)
}

const collapseKey = 'ControlOrMeta+Period'

test('in free layout, dropping a branch onto another node reparents it even with the branch selected', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'A')
  await page.keyboard.press('Enter')
  await typeNode(page, 'B')
  await page.keyboard.press('Tab')
  await typeNode(page, 'B1')
  await page.keyboard.press('Escape')

  await choose(page, 'Livre')

  const before = await scene(page)
  const a = byText(before.elements, 'A')!
  const b = byText(before.elements, 'B')!
  const b1 = byText(before.elements, 'B1')!
  const from = centerOf(b)
  const to = centerOf(a)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })

  // Mid-gesture the whole branch is selected, yet the drop still reparents the dragged node alone.
  const mid = await scene(page)
  expect(mid.selection).toEqual(expect.arrayContaining([b.id, b1.id]))

  await page.mouse.up()

  await expect
    .poll(async () => dataOf(byText(await savedElements(drive, page), 'B')!).parentId === byText(await savedElements(drive, page), 'A')!.id, {
      timeout: 10_000,
    })
    .toBe(true)

  expect(pageErrors).toEqual([])
})

test('a hand-picked color survives boxes → lines → boxes', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Escape')

  const filhoId = byText(await savedElements(drive, page), 'Filho')!.id
  await setColor(page, filhoId, '#ff00ff', '#00ff00')

  const before = await savedElements(drive, page)
  expect(byId(before, filhoId)!.strokeColor).toBe('#ff00ff')
  expect(byId(before, filhoId)!.backgroundColor).toBe('#00ff00')

  await choose(page, 'Linhas')
  await choose(page, 'Caixas')

  const after = await savedElements(drive, page)
  const filho = byId(after, filhoId)!
  expect(filho.strokeColor).toBe('#ff00ff')
  expect(filho.backgroundColor).toBe('#00ff00')
  expect(pageErrors).toEqual([])
})

test('switching to "Para a direita" and back to "Dois lados" restores the sides', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'A') // first child: right
  await page.keyboard.press('ArrowLeft') // back to the root
  await page.keyboard.press('Tab')
  await typeNode(page, 'B') // second child: the lighter (left) side
  await page.keyboard.press('Escape')

  const sidesNow = async () => {
    const els = await savedElements(drive, page)
    return ['A', 'B'].map((name) => dataOf(byText(els, name)!).side)
  }
  await expect.poll(sidesNow).toEqual(['right', 'left'])

  await choose(page, 'Para a direita')
  await expect
    .poll(async () => {
      const els = await savedElements(drive, page)
      const root = byText(els, 'Raiz')!
      return ['A', 'B'].every((name) => byText(els, name)!.x > root.x + root.width - 1)
    })
    .toBe(true)

  await choose(page, 'Dois lados')
  await expect.poll(sidesNow).toEqual(['right', 'left'])
  // B really is back on the left side of the root.
  await expect
    .poll(async () => {
      const els = await savedElements(drive, page)
      return byText(els, 'B')!.x < byText(els, 'Raiz')!.x
    })
    .toBe(true)
  expect(pageErrors).toEqual([])
})

test('in free layout, collapse → reload → expand restores the exact positions', async ({ page }) => {
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

  await choose(page, 'Livre')

  // Move the branch by hand to a distinctive spot.
  const before = await savedElements(drive, page)
  const filho = byText(before, 'Filho')!
  const from = centerOf(filho)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 180, from.y + 120, { steps: 12 })
  await page.mouse.up()

  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  const moved = await savedElements(drive, page)
  const movedFilho = byText(moved, 'Filho')!
  const movedNeto = byText(moved, 'Neto')!
  expect(movedFilho.x - filho.x).toBeGreaterThan(100)

  // Collapse the root (the dragged node stays selected; ArrowLeft goes back to the root).
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press(collapseKey)
  await expect.poll(async () => nodes(await savedElements(drive, page)).length).toBe(1)
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()

  // The reopened drawing is scrolled to its content: the collapsed root sits in the middle.
  const viewport = page.viewportSize()!
  await page.mouse.click(viewport.width / 2 - 20, viewport.height / 2)
  await page.keyboard.press(collapseKey)
  await expect.poll(async () => nodes(await savedElements(drive, page)).length, { timeout: 10_000 }).toBe(3)

  const after = await savedElements(drive, page)
  const afterFilho = byText(after, 'Filho')!
  const afterNeto = byText(after, 'Neto')!
  expect(afterFilho.x).toBeCloseTo(movedFilho.x, 0)
  expect(afterFilho.y).toBeCloseTo(movedFilho.y, 0)
  expect(afterNeto.x).toBeCloseTo(movedNeto.x, 0)
  expect(afterNeto.y).toBeCloseTo(movedNeto.y, 0)
  expect(pageErrors).toEqual([])
})

test('an old map (no layout/style) opens unchanged and gains fields only after a switch', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Escape')

  // Turn the saved file into a pre-revision map: drop the layout/style the revision adds to the root.
  await savedElements(drive, page) // ensure the map reached Drive before rewriting it
  const file = fileOf(drive)
  const json = JSON.parse(file.content) as { elements: SavedElement[] }
  const rabisco = rootOf(json.elements)
  delete rabisco.layout
  delete rabisco.style
  drive.editExternally(file.id, JSON.stringify(json))

  // Reopen the old file.
  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()

  // Opening did not write layout/style back to the file.
  const reopened = JSON.parse(drive.files.get(file.id)!.content) as { elements: SavedElement[] }
  expect(rootOf(reopened.elements).layout).toBeUndefined()
  expect(rootOf(reopened.elements).style).toBeUndefined()

  // Select the root and switch the style: now the field is written (and layout stays absent).
  const live = await scene(page)
  const liveRoot = byText(live.elements, 'Raiz')!
  await clickScenePoint(page, liveRoot.x + liveRoot.width / 2, liveRoot.y + liveRoot.height / 2)
  await expect(page.getByRole('button', { name: 'Organizar' })).toBeVisible()
  await choose(page, 'Linhas')

  await expect
    .poll(async () => {
      const now = JSON.parse(drive.files.get(file.id)!.content) as { elements: SavedElement[] }
      return rootOf(now.elements).style
    })
    .toBe('lines')
  expect(pageErrors).toEqual([])
})
