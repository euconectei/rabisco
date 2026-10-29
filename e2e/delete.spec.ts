import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

const saved = (page: Page) => page.getByRole('status').filter({ hasText: /^Salvo/ })

async function backToFiles(page: Page) {
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Meus arquivos').click()
}

async function deleteSemTitulo(page: Page) {
  await page.getByRole('button', { name: 'Apagar “Sem título”' }).click()
  await expect(page.getByRole('dialog', { name: 'Apagar este desenho?' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click()
}

test('deletes a Drive drawing after confirming: it goes to the trash and leaves the list', async ({ page }) => {
  const drive = await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  await backToFiles(page)

  // Cancelling keeps it.
  await page.getByRole('button', { name: 'Apagar “Sem título”' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('link', { name: /Sem título/ })).toBeVisible()
  expect([...drive.files.values()].some((file) => file.name === 'Sem título.excalidraw' && file.trashed)).toBe(false)

  await deleteSemTitulo(page)
  await expect(page.getByRole('heading', { name: 'Seu primeiro rabisco começa aqui' })).toBeVisible()
  expect([...drive.files.values()].some((file) => file.name === 'Sem título.excalidraw' && file.trashed)).toBe(true)

  // Still gone after a reload: Drive no longer lists it.
  await page.reload()
  await page.getByRole('button', { name: 'Continuar como Tester' }).click()
  await expect(page.getByRole('heading', { name: 'Seu primeiro rabisco começa aqui' })).toBeVisible()
})

test('deletes a drawing kept in this browser, which cannot be recovered', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Usar sem entrar' }).click()
  await page.getByRole('button', { name: /Novo desenho|Criar o primeiro desenho/ }).click()
  await expect(saved(page)).toBeVisible({ timeout: 10_000 })
  await backToFiles(page)

  await page.getByRole('button', { name: 'Apagar “Sem título”' }).click()
  await expect(page.getByRole('dialog')).toContainText('Não dá para desfazer.')
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click()
  await expect(page.getByRole('heading', { name: 'Seu primeiro rabisco começa aqui' })).toBeVisible()

  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('rabisco-local')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const count = open.result.transaction('meta').objectStore('meta').count()
          count.onsuccess = () => resolve(count.result)
        }
      }),
  )
  expect(stored).toBe(0)
})
