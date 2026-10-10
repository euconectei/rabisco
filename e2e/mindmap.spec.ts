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
  const file = [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!
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

test('undoing a deletion brings the node back without overlapping its siblings', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  for (const [i, name] of ['Um', 'Dois', 'Tres', 'Quatro'].entries()) {
    if (i === 0) await page.keyboard.press('Tab')
    else {
      await page.keyboard.press('Enter')
    }
    await typeNode(page, name)
  }
  await page.keyboard.press('ArrowUp') // Tres
  await page.keyboard.press('Delete')
  await expect.poll(async () => byText(await savedElements(drive, page), 'Tres')).toBeUndefined()
  await page.keyboard.press(undoKey)
  await expect.poll(async () => byText(await savedElements(drive, page), 'Tres'), { timeout: 10_000 }).toBeDefined()
  await expect.poll(async () => overlapping(await savedElements(drive, page)), { timeout: 10_000 }).toBe(false)
})

test('typing in the title field never acts on the selected node', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho') // Filho stays selected
  const title = page.getByRole('textbox', { name: 'Nome do desenho' })
  await title.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.type('X')
  await expect(title).toHaveValue('Sem títuXl')
  await page.keyboard.press('Enter')
  const els = await savedElements(drive, page)
  expect(nodes(els)).toHaveLength(2)
})

const collapseKey = 'ControlOrMeta+Period'
type NodeData = { parentId?: string | null; collapsed?: boolean; hidden?: unknown[] }
const dataOf = (e: SavedElement) => e.customData!.rabisco as unknown as NodeData
const centerOf = (e: SavedElement) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

test('Ctrl/Cmd + . collapses a branch that survives a reload, and expands it back', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Filho')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Neto')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press(collapseKey)
  await expect.poll(async () => nodes(await savedElements(drive, page))).toHaveLength(1)
  const root = nodes(await savedElements(drive, page))[0]
  expect(dataOf(root).collapsed).toBe(true)
  expect(dataOf(root).hidden!.length).toBeGreaterThanOrEqual(6) // 2 nodes, 2 texts, 2 links

  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  // The reopened drawing is scrolled to its content: the collapsed root sits in the middle.
  const viewport = page.viewportSize()!
  await page.mouse.click(viewport.width / 2 - 20, viewport.height / 2)
  await page.keyboard.press(collapseKey)
  await expect.poll(async () => byText(await savedElements(drive, page), 'Neto'), { timeout: 10_000 }).toBeDefined()
  expect(nodes(await savedElements(drive, page))).toHaveLength(3)
})

test('dragging a node onto another moves its branch there, without overlaps', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await createMap(page)
  await typeNode(page, 'Raiz')
  await page.keyboard.press('Tab')
  await typeNode(page, 'Um')
  await page.keyboard.press('Enter')
  await typeNode(page, 'Dois')
  await page.keyboard.press('Enter')
  await typeNode(page, 'Tres')
  await page.keyboard.press('Escape')
  const els = await savedElements(drive, page)
  const from = centerOf(byText(els, 'Tres')!)
  const to = centerOf(byText(els, 'Um')!)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => {
    const now = await savedElements(drive, page)
    return dataOf(byText(now, 'Tres')!).parentId === byText(now, 'Um')!.id
  }, { timeout: 10_000 }).toBe(true)
  expect(overlapping(await savedElements(drive, page))).toBe(false)
})

async function paste(page: Page, text: string) {
  await page.evaluate((value) => {
    const data = new DataTransfer()
    data.setData('text/plain', value)
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  }, text)
}

test('pasting a 3-level list makes a map; pasting a phrase makes a plain text', async ({ page }) => {
  const drive = await openNewDrawing(page)
  await page.mouse.click(640, 360)
  await paste(page, '- Viagem\n  - Roteiro\n    - Lisboa\n  - Malas')
  await expect.poll(async () => nodes(await savedElements(drive, page)).length, { timeout: 10_000 }).toBe(4)
  const els = await savedElements(drive, page)
  expect(dataOf(byText(els, 'Lisboa')!).parentId).toBe(byText(els, 'Roteiro')!.id)

  await page.mouse.click(200, 650)
  await paste(page, 'uma frase qualquer')
  await expect.poll(async () => (await savedElements(drive, page)).some((e) => e.type === 'text' && e.text === 'uma frase qualquer' && !e.containerId), { timeout: 10_000 }).toBe(true)
  expect(nodes(await savedElements(drive, page))).toHaveLength(4)
})

test.describe('tablet', () => {
  test.use({ hasTouch: true })

  test('a tap on a node shows the touch toolbar, and "+ filho" adds a child', async ({ page }) => {
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
    await bar.getByRole('button', { name: '+ filho' }).tap()
    await typeNode(page, 'Filho')
    await expect.poll(async () => nodes(await savedElements(drive, page)).length, { timeout: 10_000 }).toBe(2)
  })
})
