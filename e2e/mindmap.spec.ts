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
  strokeColor: string
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
  const file = drive.byName('Sem título.excalidraw')!
  return (JSON.parse(file.content) as { elements: SavedElement[] }).elements.filter((e) => !e.isDeleted)
}

const nodes = (els: SavedElement[]) => els.filter((e) => e.customData?.rabisco?.kind === 'node')
const textOf = (els: SavedElement[], id: string) => els.find((e) => e.containerId === id)?.text
const byText = (els: SavedElement[], text: string) => nodes(els).find((n) => textOf(els, n.id) === text)

const editor = (page: Page) => page.locator('textarea.excalidraw-wysiwyg')

// Typed texts avoid accents: Playwright sends non-ASCII characters through a raw text insertion
// that Excalidraw's text editor reorders (a test artifact; real keyboards compose them normally).

/** Types a node text the way a person does: once the editor is open, then Esc and wait for it to close. */
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

test('builds a map with the keyboard: Tab for a child, Enter for a sibling', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Projeto')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Pesquisa')
  await page.keyboard.press('Enter')
  await typeNode(page, 'Prototipo')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Testes')

  const els = await savedElements(drive, page)
  const root = byText(els, 'Projeto')!
  const research = byText(els, 'Pesquisa')!
  const prototype = byText(els, 'Prototipo')!
  const tests = byText(els, 'Testes')!
  expect(root.customData!.rabisco!.parentId).toBeNull()
  expect(research.customData!.rabisco!.parentId).toBe(root.id)
  expect(prototype.customData!.rabisco!.parentId).toBe(root.id)
  expect(tests.customData!.rabisco!.parentId).toBe(prototype.id)
  expect(research.customData!.rabisco!.order).toBeLessThan(prototype.customData!.rabisco!.order!)
  expect(els.filter((e) => e.customData?.rabisco?.kind === 'edge')).toHaveLength(3)
  expect(research.strokeColor).not.toBe(prototype.strokeColor)
})

function overlapping(els: SavedElement[]) {
  const boxes = nodes(els)
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) return true
    }
  return false
}

const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'

test('Delete removes a branch with its links, and undo brings it back', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('Delete')
  await expect.poll(async () => byText(await savedElements(drive, page), 'Neto')).toBeUndefined()
  const els = await savedElements(drive, page)
  expect(nodes(els)).toHaveLength(2)
  expect(els.filter((e) => e.customData?.rabisco?.kind === 'edge')).toHaveLength(1)
  await page.keyboard.press(undoKey)
  await expect.poll(async () => byText(await savedElements(drive, page), 'Neto'), { timeout: 10_000 }).toBeDefined()
  expect((await savedElements(drive, page)).filter((e) => e.customData?.rabisco?.kind === 'edge')).toHaveLength(2)
})

test('leaves Tab and Enter alone outside mind map nodes', async ({ page }) => {
  const drive = await openNewDrawing(page)
  // Nothing selected: Tab creates nothing.
  await page.mouse.click(300, 500)
  await page.keyboard.press('Tab')
  // A plain text: Enter inside it breaks the line.
  await page.mouse.dblclick(400, 500)
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type('linha um')
  await page.keyboard.press('Enter')
  await page.keyboard.type('linha dois')
  await page.keyboard.press('Escape')
  const els = await savedElements(drive, page)
  expect(nodes(els)).toHaveLength(0)
  expect(els.some((e) => e.type === 'text' && e.text === 'linha um\nlinha dois')).toBe(true)
})

test('a long, multi-line node text re-lays out the map without overlaps', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Um')
  await page.keyboard.press('Enter')
  await typeNode(page, 'Dois')
  await page.keyboard.press('Enter')
  await typeNode(page, 'Tres')
  // Edit "Dois" into three lines.
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('F2')
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type('Dois, agora com um texto bem maior')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('em varias')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('linhas')
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await savedElements(drive, page)).some((e) => e.text?.includes('varias'))).toBe(true)
  expect(overlapping(await savedElements(drive, page))).toBe(false)
})
