import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle, type FakeDrive } from './fakes/google'

test.use({ locale: 'pt-BR' })

const editor = (page: Page) => page.locator('textarea.excalidraw-wysiwyg')

/** A new drawing with a one-node map whose root reads "Projeto". */
async function drawingWithMap(page: Page): Promise<FakeDrive> {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await page.getByRole('button', { name: 'Mapa mental' }).click()
  await page.getByTestId('mindmap-placement').click({ position: { x: 640, y: 360 } })
  await expect(editor(page)).toBeVisible()
  await page.keyboard.type('Projeto')
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible({ timeout: 10_000 })
  return drive
}

async function openExportDialog(page: Page) {
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Exportar imagem…').click()
  return page.getByRole('dialog', { name: 'Exportar imagem' })
}

test('downloads a PNG and saves numbered copies next to the drawing in Drive', async ({ page }) => {
  const drive = await drawingWithMap(page)
  const dialog = await openExportDialog(page)

  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Baixar' }).click()
  expect((await download).suggestedFilename()).toBe('Sem título.png')

  await dialog.getByRole('button', { name: 'Salvar no Drive' }).click()
  await expect(dialog.getByText('Salvo no Drive como Sem título.png.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar no Drive' }).click()
  await expect(dialog.getByText('Salvo no Drive como Sem título (2).png.')).toBeVisible()

  const drawing = drive.byName('Sem título.excalidraw')!
  const png = drive.byName('Sem título.png')!
  expect(png.mimeType).toBe('image/png')
  expect(png.parents).toEqual(drawing.parents)
  // A real PNG made it through the multipart upload byte for byte.
  expect([...png.bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
})

for (const format of ['PNG', 'SVG'] as const) {
  test(`an exported ${format} with editable data reopens in Rabisco as a new drawing`, async ({ page }) => {
    const drive = await drawingWithMap(page)
    const dialog = await openExportDialog(page)
    await dialog.getByRole('radio', { name: format }).check()
    await dialog.getByRole('checkbox', { name: 'Incluir dados editáveis' }).check()
    await dialog.getByRole('button', { name: 'Salvar no Drive' }).click()
    const name = `Sem título.${format.toLowerCase()}`
    await expect(dialog.getByText(`Salvo no Drive como ${name}.`)).toBeVisible()
    await dialog.getByRole('button', { name: 'Fechar' }).click()

    const image = drive.byName(name)!
    await page.goto('/app')
    await page.getByRole('button', { name: /Continuar como/ }).click()
    await page.getByLabel('Importar').setInputFiles({ name: `Plano.${format.toLowerCase()}`, mimeType: image.mimeType, buffer: image.bytes })
    await expect(page.locator('.excalidraw')).toBeVisible()
    await expect.poll(() => drive.byName('Plano.excalidraw')?.content ?? '').toContain('"Projeto"')
  })
}

test('an image without editable data is refused with an explanation', async ({ page }) => {
  const drive = await drawingWithMap(page)
  const dialog = await openExportDialog(page)
  await dialog.getByRole('button', { name: 'Salvar no Drive' }).click()
  await expect(dialog.getByText('Salvo no Drive como Sem título.png.')).toBeVisible()

  await page.goto('/app')
  await page.getByRole('button', { name: /Continuar como/ }).click()
  await page.getByLabel('Importar').setInputFiles({ name: 'Foto.png', mimeType: 'image/png', buffer: drive.byName('Sem título.png')!.bytes })
  await expect(page.getByRole('alert')).toContainText('Esta imagem não tem um desenho editável dentro.')
  expect(drive.byName('Foto.excalidraw')).toBeUndefined()
})

test('without a connection, saving to Drive fails with a message while downloading still works', async ({ page }) => {
  await drawingWithMap(page)
  const dialog = await openExportDialog(page)
  // The connection drops just for the image upload (a new file: POST /upload/drive/v3/files?…).
  // Routed requests ignore setOffline, so the failure is made at the route.
  await page.route(/\/upload\/drive\/v3\/files\?/, (route) => route.abort('internetdisconnected'))
  await dialog.getByRole('button', { name: 'Salvar no Drive' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Não deu certo. Verifique sua conexão e tente de novo.')
  await page.context().setOffline(true)
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Baixar' }).click()
  expect((await download).suggestedFilename()).toBe('Sem título.png')
  await page.context().setOffline(false)
})
