import { expect, test, type Page } from '@playwright/test'
import { pretendToBeChrome95 } from './fakes/chrome95'

// The tracing notebook at /kids is a standalone static page (public/kids), made for an old
// Android tablet with a pen. It keeps drawings on the device and talks to no one but its own site.
test.use({ locale: 'pt-BR' })

async function open(page: Page, baseURL: string | undefined) {
  const errors: string[] = []
  const elsewhere: string[] = []
  const host = new URL(baseURL ?? 'http://localhost:4173').host
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.host !== host) elsewhere.push(request.url())
  })
  await page.goto('/kids/')
  return { errors, elsewhere }
}

// Draws the letter I: one vertical stroke down the middle of the sheet.
async function traceLetterI(page: Page) {
  await page.getByRole('button', { name: 'Letras' }).click()
  await page.getByRole('button', { name: 'Letra I', exact: true }).click()
  const box = await page.locator('#stage').boundingBox()
  if (!box) throw new Error('no stage')
  const x = box.x + box.width / 2
  await page.mouse.move(x, box.y + box.height * 0.08)
  await page.mouse.down()
  for (let i = 1; i <= 40; i++) await page.mouse.move(x, box.y + box.height * (0.08 + 0.84 * (i / 40)))
  await page.mouse.up()
}

test('the picker shows every notebook as a picture, with no links out and no third-party requests', async ({ page, baseURL }) => {
  const { errors, elsewhere } = await open(page, baseURL)
  await expect(page.getByRole('heading', { name: 'Caderno de Traçar' })).toBeVisible()
  for (const tab of ['Traços', 'Letras', 'Números', 'Cursiva', 'Desenhos', 'Meus desenhos']) {
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Desenhos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Caminhão' })).toBeVisible()
  // Kids can't wander off into the editor or the parent's files.
  await expect(page.locator('a[href]')).toHaveCount(0)
  expect(errors).toEqual([])
  expect(elsewhere).toEqual([])
})

test('a finished page celebrates, keeps its stars and lands in "Meus desenhos"', async ({ page, baseURL }) => {
  const { errors } = await open(page, baseURL)
  await page.getByRole('button', { name: 'Meus desenhos' }).click()
  await expect(page.locator('.shot')).toHaveCount(0)
  await traceLetterI(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading')).toHaveText(/Você conseguiu!|Muito bem!|Que capricho!/)
  await dialog.getByRole('button', { name: 'De novo' }).click()
  await page.getByRole('button', { name: 'Voltar ao caderno' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Letras' }).click()
  await expect(page.getByRole('button', { name: 'Letra I', exact: true }).locator('.st-on').first()).toBeVisible()
  await page.getByRole('button', { name: 'Meus desenhos' }).click()
  await expect(page.locator('.shot img')).toHaveCount(1)
  await page.locator('.shot').click()
  await expect(page.getByRole('dialog', { name: 'Desenho guardado' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a scribble that misses the guide does not count', async ({ page, baseURL }) => {
  await open(page, baseURL)
  await page.getByRole('button', { name: 'Letras' }).click()
  await page.getByRole('button', { name: 'Letra I', exact: true }).click()
  const box = await page.locator('#stage').boundingBox()
  if (!box) throw new Error('no stage')
  await page.mouse.move(box.x + 40, box.y + 40)
  await page.mouse.down()
  await page.mouse.move(box.x + 200, box.y + box.height - 40, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('grown-up options open only after holding the gear', async ({ page, baseURL }) => {
  await open(page, baseURL)
  const gear = page.getByRole('button', { name: /Opções para adultos/ })
  const panel = page.getByRole('dialog', { name: 'Para os adultos' })
  await gear.click()
  await expect(panel).toBeHidden()
  const box = await gear.boundingBox()
  if (!box) throw new Error('no gear')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(panel).toBeVisible({ timeout: 3000 })
  await page.mouse.up()
  await panel.getByRole('button', { name: 'Pronto' }).click()
  await expect(panel).toBeHidden()
})

test('it still works on the old tablet browser (Chrome 95)', async ({ page, baseURL }) => {
  await pretendToBeChrome95(page)
  const { errors } = await open(page, baseURL)
  await traceLetterI(page)
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(errors).toEqual([])
})
