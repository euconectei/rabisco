import { expect, test, type Page } from '@playwright/test'
import { FakeDrive, installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

async function signInAndCreate(page: Page) {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
}

async function typeOnCanvas(page: Page, text: string) {
  await page.mouse.dblclick(600, 350)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
}

test('signs in, creates a drawing and autosaves it to Drive with a thumbnail', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await signInAndCreate(page)
  await typeOnCanvas(page, 'Rabisco no Drive')
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => drive.byName('Sem título.excalidraw')?.content ?? '').toContain('Rabisco no Drive')
  expect(drive.byName('Sem título.excalidraw')?.thumbnail?.mimeType).toBe('image/png')
  expect(drive.byName('Rabisco')?.mimeType).toBe('application/vnd.google-apps.folder')
})

test('after a reload, "Continue as" reopens the same file without losing anything', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await signInAndCreate(page)
  await typeOnCanvas(page, 'Continua aqui')
  await expect.poll(() => drive.byName('Sem título.excalidraw')?.content ?? '').toContain('Continua aqui')
  const savedVersion = drive.byName('Sem título.excalidraw')!.version

  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  expect(drive.requests.some((r) => r.includes(`/files/${drive.byName('Sem título.excalidraw')!.id}?alt=media`))).toBe(true)
  expect(drive.byName('Sem título.excalidraw')!.content).toContain('Continua aqui')
  expect(drive.byName('Sem título.excalidraw')!.version).toBe(savedVersion)
})

test('an edit made elsewhere raises a conflict, and "Use the Drive version" keeps it', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await signInAndCreate(page)
  const file = drive.byName('Sem título.excalidraw')!
  const external = file.content.replace('"elements": []', '"elements": [{"id":"ext","type":"text","x":0,"y":0,"width":80,"height":25,"text":"Do tablet","originalText":"Do tablet","fontSize":20,"fontFamily":5}]')
  drive.editExternally(file.id, external)

  await typeOnCanvas(page, 'Minha versão')
  await expect(page.getByRole('dialog', { name: 'Este desenho mudou em outro lugar' })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Usar a do Drive' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  expect(drive.files.get(file.id)!.content).toContain('Do tablet')
  expect(drive.files.get(file.id)!.content).not.toContain('Minha versão')
})

test('the files page lists drawings and opens them', async ({ page }) => {
  const drive = new FakeDrive()
  drive.add({ name: 'Plano da viagem.excalidraw', content: '{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}' })
  await installFakeGoogle(page, drive)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  const list = page.getByRole('list', { name: 'Seus desenhos' })
  await expect(list.getByRole('link', { name: /Plano da viagem/ })).toBeVisible()
  await expect(list).not.toContainText('.excalidraw')
  await list.getByRole('link', { name: /Plano da viagem/ }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nome do desenho' })).toHaveValue('Plano da viagem')
})

test('a temporary Drive outage is retried and the drawing still gets saved', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await signInAndCreate(page)
  drive.uploadFailures = [503, 503]
  await typeOnCanvas(page, 'Mesmo com falha')
  await expect.poll(() => drive.byName('Sem título.excalidraw')?.content ?? '', { timeout: 15_000 }).toContain('Mesmo com falha')
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  expect(drive.uploadFailures).toEqual([])
})
