// Generates the landing page screenshots in public/landing/ (`pnpm screenshots`), one set per language
// and theme, from the real editor against the fake Google used by the E2E suite. Run it by hand when
// the editor's look changes and commit the images; it is not part of CI.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { FakeDrive, installFakeGoogle } from '../../e2e/fakes/google'

const OUT = join(process.cwd(), 'public/landing')
mkdirSync(OUT, { recursive: true })

// Typed texts avoid accents: Playwright inserts non-ASCII characters in a way Excalidraw's text
// editor reorders (see e2e/mindmap.spec.ts). File names are seeded, so they can have accents.
const CONTENT = {
  'pt-BR': {
    signIn: 'Entrar com Google',
    newFile: 'Novo',
    saved: 'Salvo',
    mindmap: 'Mapa mental',
    myFiles: 'Meus arquivos',
    darkMode: 'Modo escuro',
    filesList: 'Seus desenhos',
    map: ['Viagem', [['Roteiro', ['Lisboa', 'Porto']], ['Malas', ['Roupas', 'Livros']], ['Passeios', ['Museus', 'Praias']]]],
    flow: ['Ideia', 'Rascunho', 'Publicar'],
    title: 'Planos para julho',
    files: ['Plano de estudos', 'Fluxo de cadastro', 'Ideias para o blog', 'Reunião de segunda'],
  },
  en: {
    signIn: 'Sign in with Google',
    newFile: 'New',
    saved: 'Saved',
    mindmap: 'Mind map',
    myFiles: 'My files',
    darkMode: 'Dark mode',
    filesList: 'Your drawings',
    map: ['Trip', [['Route', ['Lisbon', 'Porto']], ['Packing', ['Clothes', 'Books']], ['Activities', ['Museums', 'Beaches']]]],
    flow: ['Idea', 'Draft', 'Publish'],
    title: 'Plans for July',
    files: ['Study plan', 'Sign-up flow', 'Blog ideas', 'Monday meeting'],
  },
} as const

const editor = (page: Page) => page.locator('textarea.excalidraw-wysiwyg')

async function type(page: Page, text: string) {
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
}

/** A box drawn with a tool shortcut, with a label typed into it. */
async function box(page: Page, tool: string, x: number, y: number, label: string) {
  await page.keyboard.press(tool)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 220, y + 90, { steps: 8 })
  await page.mouse.up()
  await page.mouse.dblclick(x + 110, y + 45)
  await type(page, label)
}

async function arrow(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press('a')
  await page.mouse.move(...from)
  await page.mouse.down()
  await page.mouse.move(...to, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.press('Escape')
}

/** A freehand star next to the last step: the "drawn by hand" part of the flow. */
async function doodle(page: Page, cx: number, cy: number) {
  await page.keyboard.press('7') // freedraw
  const points = Array.from({ length: 11 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    return [cx + 34 * Math.cos(angle), cy + 34 * Math.sin(angle)] as const
  })
  await page.mouse.move(...points[0])
  await page.mouse.down()
  for (const point of points.slice(1)) await page.mouse.move(...point, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.press('Escape')
}

/** Saves a PNG screenshot as WebP, converted by the browser (no image tooling needed). */
async function saveWebp(page: Page, png: Buffer, name: string) {
  const dataUrl = await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    return canvas.toDataURL('image/webp', 0.82)
  }, png.toString('base64'))
  writeFileSync(join(OUT, `${name}.webp`), Buffer.from(dataUrl.split(',')[1], 'base64'))
}

for (const lang of ['pt-BR', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${lang} ${theme}`, () => {
      test.use({ locale: lang, colorScheme: theme, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })

      test('landing screenshots', async ({ page }) => {
        const c = CONTENT[lang]
        const drive = new FakeDrive()
        for (const name of c.files) drive.add({ name: `${name}.excalidraw`, content: '{"type":"excalidraw","elements":[]}' })
        await installFakeGoogle(page, drive)
        // The page's clock matches the fake Drive's, so "edited … ago" does not depend on when this runs.
        await page.clock.setFixedTime(new Date('2026-10-09T14:00:00Z'))

        await page.goto('/app')
        await page.getByRole('button', { name: c.signIn }).click()
        await page.getByRole('button', { name: c.newFile }).click()
        await expect(page.locator('.excalidraw')).toBeVisible()
        if (theme === 'dark') {
          await page.getByTestId('main-menu-trigger').click()
          await page.getByText(c.darkMode).click()
        }
        await page.locator('.title-field').fill(c.title)
        await page.keyboard.press('Enter')
        await page.locator('.title-field').blur()

        // Excalidraw's contextual hint ("to move the canvas…") and the save status are noise in a product shot.
        await page.addStyleTag({ content: '.HintViewer, .save-status { display: none !important; }' })

        // Mind map in the middle of the screen. First-level branches alternate sides (right, left,
        // right), so the key that walks back to the root depends on the branch's side.
        const [root, branches] = c.map
        await page.getByRole('button', { name: c.mindmap }).click()
        await page.getByTestId('mindmap-placement').click({ position: { x: 640, y: 420 } })
        await type(page, root)
        for (const [i, [branch, leaves]] of branches.entries()) {
          await page.keyboard.press(i === 0 ? 'Tab' : 'Enter')
          await type(page, branch)
          for (const [j, leaf] of leaves.entries()) {
            await page.keyboard.press(j === 0 ? 'Tab' : 'Enter')
            await type(page, leaf)
          }
          const towardRoot = i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight'
          await page.keyboard.press(towardRoot)
          if (i < branches.length - 1) await page.keyboard.press(towardRoot)
        }
        await page.keyboard.press('Escape')
        await page.mouse.click(1200, 760)
        await page.keyboard.press('Shift+1') // zoom to fit
        await page.mouse.move(1270, 790)
        await expect(page.locator('.save-status').filter({ hasText: c.saved })).toBeAttached({ timeout: 10_000 })
        const prefix = `${lang}-`
        // The map alone, without the editor's bottom bar (zoom, undo) creeping into the crop.
        const footer = await page.addStyleTag({ content: '.layer-ui__wrapper__footer-left, .zoom-actions, .undo-redo-buttons { display: none !important; }' })
        await saveWebp(page, await page.screenshot({ clip: { x: 70, y: 82, width: 1140, height: 712 } }), `${prefix}mindmap-${theme}`)
        await footer.evaluate((el) => el.remove())

        // A handwritten title above the map fills the canvas shot.
        await page.keyboard.press('t')
        await page.mouse.click(520, 250)
        await type(page, c.title)
        // Esc leaves the new text selected: bump its size twice.
        await page.keyboard.press('ControlOrMeta+Shift+Period')
        await page.keyboard.press('ControlOrMeta+Shift+Period')
        await page.keyboard.press('Escape')

        // Hand-drawn flow on empty canvas to the right of the map, at 100% zoom.
        await page.keyboard.press('ControlOrMeta+0') // reset zoom
        await expect(page.getByText('100%', { exact: true })).toBeVisible()
        for (let i = 0; i < 9; i++) await page.mouse.wheel(250, 0)
        const [idea, draft, publish] = c.flow
        await box(page, 'r', 380, 170, idea)
        await box(page, 'o', 380, 330, draft)
        await box(page, 'd', 380, 490, publish)
        await arrow(page, [490, 262], [490, 322])
        await arrow(page, [490, 422], [490, 482])
        await doodle(page, 700, 535)
        await page.keyboard.press('Escape')
        await page.mouse.click(1200, 760)
        await page.mouse.move(1270, 790)
        await expect(page.locator('.save-status').filter({ hasText: c.saved })).toBeAttached({ timeout: 10_000 })
        await saveWebp(page, await page.screenshot({ clip: { x: 232, y: 150, width: 720, height: 450 } }), `${prefix}draw-${theme}`)

        // Map and flow together. Zooming is a scene change too: let it reach the save status.
        await page.keyboard.press('Shift+1')
        await page.waitForTimeout(800)
        await expect(page.locator('.save-status').filter({ hasText: c.saved })).toBeAttached({ timeout: 10_000 })
        await saveWebp(page, await page.screenshot(), `${prefix}canvas-${theme}`)

        // The files list, reached through the menu so the session stays signed in.
        await page.getByTestId('main-menu-trigger').click()
        await page.getByText(c.myFiles).click()
        await expect(page.getByRole('list', { name: c.filesList })).toBeVisible()
        await saveWebp(page, await page.screenshot({ clip: { x: 290, y: 0, width: 700, height: 415 } }), `${prefix}files-${theme}`)
      })
    })
  }
}
