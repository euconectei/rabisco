import { expect, test, type Page } from '@playwright/test'
import { FakeDrive, installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })


const FLOW = `flowchart TD
  A[Início] --> B{Pagamento ok?}
  B -->|sim| C[Enviar pedido]
  B -->|não| D[Cancelar]`

type SceneElement = {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  text?: string
  link?: string | null
  containerId?: string | null
  isDeleted?: boolean
  points?: number[][]
  endBinding?: { elementId: string } | null
  startBinding?: { elementId: string } | null
}

const textbox = (page: Page) => page.getByRole('textbox', { name: 'Código Mermaid' })

async function signIn(page: Page, drive = new FakeDrive()) {
  await installFakeGoogle(page, drive)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await expect(page.getByRole('button', { name: 'Importar Mermaid' }).first()).toBeVisible()
  return drive
}

async function scene(page: Page): Promise<SceneElement[]> {
  return page.evaluate(() => (window.__rabiscoScene?.().elements ?? []) as unknown as SceneElement[])
}

async function liveElements(page: Page) {
  return (await scene(page)).filter((element) => !element.isDeleted)
}

/** Imports the text from the files page; resolves once the editor shows the drawing. */
async function importMermaid(page: Page, text: string) {
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await textbox(page).fill(text)
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page).toHaveURL(/\/edit\//)
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect.poll(async () => (await liveElements(page)).length).toBeGreaterThan(0)
}

async function openInsert(page: Page) {
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Inserir Mermaid…', { exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Inserir Mermaid' })).toBeVisible()
}

test('a flowchart becomes an editable drawing, with the diamond label whole and the arrows still attached', async ({ page }) => {
  await signIn(page)
  await importMermaid(page, FLOW)

  const elements = await liveElements(page)
  expect(elements.some((e) => e.type === 'image')).toBe(false)
  const diamond = elements.find((e) => e.type === 'diamond')!
  expect(diamond).toBeTruthy()
  const label = elements.find((e) => e.containerId === diamond.id)!
  expect(label.text).toContain('Pagamento')
  // No line may hold a piece of the word: "Pagamen" / "to ok?".
  expect(label.text!.split('\n').some((line) => line.includes('Pagamento'))).toBe(true)

  const arrows = elements.filter((e) => e.type === 'arrow')
  expect(arrows.length).toBeGreaterThanOrEqual(3)
  const toDiamond = arrows.find((a) => a.endBinding?.elementId === diamond.id)!
  expect(toDiamond).toBeTruthy()
  const last = toDiamond.points![toDiamond.points!.length - 1]
  const endX = toDiamond.x + last[0]
  const endY = toDiamond.y + last[1]
  // The tip lands on the widened diamond's outline (its top vertex, give or take the binding gap).
  expect(Math.abs(endX - (diamond.x + diamond.width / 2))).toBeLessThan(20)
  expect(Math.abs(endY - diamond.y)).toBeLessThan(20)

})

test('a name taken from the chosen file, and an .mmd file fills the box with its exact content', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  const content = 'flowchart LR\n  A --> B\n'
  await page.getByLabel(/Ou escolha um arquivo/).setInputFiles({ name: 'meu-fluxo.mmd', mimeType: 'text/plain', buffer: Buffer.from(content) })
  await expect(textbox(page)).toHaveValue(content)
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.getByRole('textbox', { name: 'Nome do desenho' })).toHaveValue('meu-fluxo')
})

test('creates a .excalidraw in the Rabisco folder of the Drive', async ({ page }) => {
  const drive = await signIn(page)
  await importMermaid(page, FLOW)
  await expect.poll(() => [...drive.files.values()].filter((f) => f.name.endsWith('.excalidraw')).length).toBe(1)
  const file = [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!
  expect(file.content).toContain('Pagamento')
  expect(drive.byName('Rabisco')?.mimeType).toBe('application/vnd.google-apps.folder')
})

test('invalid Mermaid shows a friendly message, creates nothing, does not navigate and keeps the text', async ({ page }) => {
  const drive = await signIn(page)
  const before = drive.files.size
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await textbox(page).fill('flowchart TD\nA--')
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('O Mermaid não entendeu este texto')
  await expect(alert).not.toContainText(/at |Error|Parse error/)
  await expect(page).toHaveURL(/\/app$/)
  await expect(textbox(page)).toHaveValue('flowchart TD\nA--')
  expect(drive.files.size).toBe(before)
  // Mermaid leaves its render nodes behind on a real failure; none may stay.
  expect(await page.evaluate(() => document.querySelectorAll('[id^="dmermaid"], [id^="mermaid-to-excalidraw"]').length)).toBe(0)
})

test('empty text asks for a diagram', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.getByRole('alert')).toContainText('Cole um diagrama Mermaid')
})

test('Esc closes the dialog without creating anything, and the focus starts in the text box', async ({ page }) => {
  const drive = await signIn(page)
  const before = drive.files.size
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await expect(textbox(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/app$/)
  expect(drive.files.size).toBe(before)
})

for (const [name, text] of [
  ['sequence', 'sequenceDiagram\n  Alice->>Bob: Oi\n  Bob-->>Alice: Olá'],
  ['ER', 'erDiagram\n  CLIENTE ||--o{ PEDIDO : faz'],
] as const) {
  test(`a ${name} diagram either creates elements or explains why not, never an empty drawing`, async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
    await textbox(page).fill(text)
    await page.getByRole('button', { name: 'Criar desenho' }).click()
    await expect(page.getByRole('alert').or(page.locator('.excalidraw'))).toBeVisible({ timeout: 20_000 })
    if (/\/edit\//.test(page.url())) {
      await expect.poll(async () => (await liveElements(page)).length).toBeGreaterThan(0)
      expect((await liveElements(page)).some((e) => e.type === 'image')).toBe(false)
    } else {
      await expect(page.getByRole('alert')).toContainText(/Mermaid|diagrama/)
    }
  })
}

test('Insert Mermaid adds the diagram to the open drawing and leaves the other elements untouched', async ({ page }) => {
  await signIn(page)
  await importMermaid(page, 'flowchart LR\n  X[Um] --> Y[Dois]')
  const before = await liveElements(page)
  await openInsert(page)
  await textbox(page).fill(FLOW)
  await page.getByRole('button', { name: 'Inserir no desenho' }).click()
  await expect(page.getByRole('dialog', { name: 'Inserir Mermaid' })).toHaveCount(0)
  await expect.poll(async () => (await liveElements(page)).length).toBeGreaterThan(before.length)

  const after = await liveElements(page)
  for (const old of before) {
    const same = after.find((e) => e.id === old.id)!
    expect(same, old.id).toBeTruthy()
    expect([same.x, same.y, same.width, same.height]).toEqual([old.x, old.y, old.width, old.height])
  }
  const ids = after.map((e) => e.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('inserting an invalid diagram shows the error and leaves the scene as it was', async ({ page }) => {
  await signIn(page)
  await importMermaid(page, 'flowchart LR\n  X[Um] --> Y[Dois]')
  const before = JSON.stringify(await scene(page))
  await openInsert(page)
  await textbox(page).fill('flowchart TD\nA--')
  await page.getByRole('button', { name: 'Inserir no desenho' }).click()
  await expect(page.getByRole('alert')).toContainText('O Mermaid não entendeu')
  expect(JSON.stringify(await scene(page))).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Inserir Mermaid' })).toHaveCount(0)
  expect(JSON.stringify(await scene(page))).toBe(before)
})

test('the main menu offers "Inserir Mermaid…" and not the English built-in', async ({ page }) => {
  await signIn(page)
  await importMermaid(page, 'flowchart LR\n  X --> Y')
  await page.getByTestId('main-menu-trigger').click()
  await expect(page.getByText('Inserir Mermaid…', { exact: true })).toBeVisible()
  await expect(page.getByText(/Mermaid to Excalidraw/i)).toHaveCount(0)
})

test.describe('hostile input', () => {
  async function watch(page: Page) {
    const external: string[] = []
    await page.route(/^https?:\/\/(?!localhost)(?!accounts\.google\.com|www\.googleapis\.com)/, (route) => {
      external.push(route.request().url())
      return route.abort()
    })
    page.on('dialog', (dialog) => void dialog.dismiss())
    return external
  }

  for (const [name, payload] of [
    ['an img with onerror', 'flowchart TD\nA["<img src=x onerror=window.PWN1=1>"]'],
    ['a remote image', 'flowchart TD\nA["<img src=https://evil.example/pixel.png>"]'],
    ['a script tag', 'flowchart TD\nA["<script>window.PWN2=1</script>"]'],
    ['a javascript: link', 'flowchart TD\nA-->B\nclick A "javascript:window.PWN3=1"'],
  ] as const) {
    test(`${name} is refused and nothing runs or loads`, async ({ page }) => {
      const external = await watch(page)
      const drive = await signIn(page)
      const before = drive.files.size
      await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
      await textbox(page).fill(payload)
      await page.getByRole('button', { name: 'Criar desenho' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => Object.keys(window).filter((key) => key.startsWith('PWN')))).toEqual([])
      expect(external).toEqual([])
      expect(drive.files.size).toBe(before)
    })
  }

  test('a click directive reaches the converter in strict mode: nothing runs and no link survives', async ({ page }) => {
    const external = await watch(page)
    await signIn(page)
    await importMermaid(page, 'flowchart TD\nA[Alvo] --> B[Fim]\nclick A call window.PWN4()\nclick B href "https://evil.example/x"')
    const elements = await liveElements(page)
    expect(elements.length).toBeGreaterThan(0)
    expect(elements.every((e) => !e.link)).toBe(true)
    expect(await page.evaluate(() => Object.keys(window).filter((key) => key.startsWith('PWN')))).toEqual([])
    expect(external).toEqual([])
  })

  test('an init directive cannot loosen the security level', async ({ page }) => {
    const external = await watch(page)
    await signIn(page)
    await importMermaid(page, `%%{init: {"securityLevel": "loose"}}%%\nflowchart TD\nA["<b>x</b>"] --> B\nclick A call window.PWN5()`)
    expect(await page.evaluate(() => Object.keys(window).filter((key) => key.startsWith('PWN')))).toEqual([])
    expect(external).toEqual([])
  })
})

test('the Mermaid chunk is only downloaded after the dialog is used', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname)
  })
  await signIn(page)
  await page.waitForLoadState('networkidle')
  const heavy = /Diagram|mermaid|cytoscape|katex/i
  expect(scripts.filter((path) => heavy.test(path))).toEqual([])

  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await page.waitForLoadState('networkidle')
  expect(scripts.filter((path) => heavy.test(path))).toEqual([])

  await textbox(page).fill('flowchart TD\nA --> B')
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  expect(scripts.filter((path) => heavy.test(path)).length).toBeGreaterThan(0)
})

test('<br> inside labels becomes a line break, never a literal tag in the drawing', async ({ page }) => {
  await signIn(page)
  await importMermaid(page, 'flowchart TD\n  A["Primeira<br>segunda<br/>terceira"] --> B[Um<br />dois]')
  const texts = (await liveElements(page)).filter((e) => e.type === 'text').map((e) => e.text ?? '')
  expect(texts.join('|')).not.toMatch(/<br|&lt;/i)
  const first = texts.find((text) => text.includes('Primeira'))!
  expect(first.split('\n').map((line) => line.trim())).toEqual(expect.arrayContaining(['Primeira', 'segunda', 'terceira']))
  expect(texts.some((text) => /Um\s+dois/.test(text.replace(/\n/g, ' ')))).toBe(true)
})

test('a Markdown note with a mermaid fence fills the box as chosen and converts only the diagram', async ({ page }) => {
  await signIn(page)
  const note = '---\ntitle: Nota\ntags: [a]\n---\n# Minha nota\n\nTexto antes.\n\n```mermaid\nflowchart TD\n  A[Início] --> B[Fim]\n```\n\nMais texto.\n'
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await page.getByLabel(/Ou escolha um arquivo/).setInputFiles({ name: 'nota.md', mimeType: 'text/markdown', buffer: Buffer.from(note) })
  await expect(textbox(page)).toHaveValue(note)
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page).toHaveURL(/\/edit\//)
  await expect.poll(async () => (await liveElements(page)).map((e) => e.text ?? '').join('|')).toContain('Início')
  expect((await liveElements(page)).map((e) => e.text ?? '').join('|')).not.toContain('Minha nota')
})

test('a flowchart with a subgraph converts', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await textbox(page).fill('flowchart TD\n  subgraph Grupo\n    A[Um] --> B[Dois]\n  end\n  B --> C[Fora]')
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.getByRole('alert').or(page.locator('.excalidraw'))).toBeVisible({ timeout: 20_000 })
  // Whatever the library decides, the person gets a drawing or a message, never a blank page.
  if (/\/edit\//.test(page.url())) expect((await liveElements(page)).length).toBeGreaterThan(0)
  else await expect(page.getByRole('alert')).toBeVisible()
  test.info().annotations.push({ type: 'subgraph', description: page.url().includes('/edit/') ? 'converted' : await page.getByRole('alert').innerText() })
})

test('more than 500 edges is explained as too many elements, not as a syntax error', async ({ page }) => {
  await signIn(page)
  const lines = Array.from({ length: 700 }, (_, i) => `  N${i}-->M${i}`)
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  await textbox(page).fill(`flowchart TD\n${lines.join('\n')}`)
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.getByRole('alert')).toContainText('elementos demais', { timeout: 30_000 })
  await expect(page).toHaveURL(/\/app$/)
})

test('a huge paste is not cut: the box stays responsive and the size is explained', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Importar Mermaid' }).first().click()
  const size = 1_500_000
  await textbox(page).fill('%%{'.repeat(size / 3))
  expect((await textbox(page).inputValue()).length).toBe(size)
  const started = Date.now()
  await page.getByRole('button', { name: 'Criar desenho' }).click()
  await expect(page.getByRole('alert')).toContainText('passa de 20000 caracteres')
  expect(Date.now() - started).toBeLessThan(3000)
  await expect(page).toHaveURL(/\/app$/)
})

test('after a drawing is moved to the Drive, its old local address opens the copy', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^Salvo/ })).toBeVisible({ timeout: 10_000 })
  const oldUrl = page.url()
  expect(oldUrl).toContain('/edit/local-')
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Meus arquivos').click()
  await page.getByRole('complementary', { name: 'Aviso sobre o modo local' }).getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Mover para o Drive' }).click()
  await expect(page.getByText('Seu desenho foi movido para o Drive.')).toBeVisible()
  const copy = [...drive.files.values()].find((f) => f.name.endsWith('.excalidraw'))!

  await page.goto(oldUrl)
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(`/edit/${copy.id}`)
  await expect(page.locator('.excalidraw')).toBeVisible()
})
