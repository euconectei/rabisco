import { expect, test, type Page } from '@playwright/test'
import { installFakeAdsense } from './fakes/adsense'
import { installFakeGoogle } from './fakes/google'

test.use({ locale: 'pt-BR' })

const adSlot = (page: Page) => page.getByRole('complementary', { name: 'Anúncio' })
const notice = (page: Page) => page.getByRole('region', { name: 'Cookies' })

async function signIn(page: Page) {
  await installFakeGoogle(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Entrar com Google' }).click()
  await expect(page.getByRole('heading', { name: 'Meus arquivos' })).toBeVisible()
}

test.describe('Europe', () => {
  test.use({ timezoneId: 'Europe/Lisbon' })

  test('only the house ad, no notice and no request to AdSense, in the files page and the editor', async ({ page }) => {
    const adsense = await installFakeAdsense(page)
    await signIn(page)
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()
    await page.getByRole('button', { name: 'Novo' }).click()
    await expect(page.locator('.excalidraw')).toBeVisible()
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
    expect(adsense.requests).toEqual([])
  })
})

test.describe('Brazil', () => {
  test.use({ timezoneId: 'America/Sao_Paulo' })

  test('asks first with the house ad; "Aceitar" loads AdSense and the notice does not come back', async ({ page }) => {
    const adsense = await installFakeAdsense(page)
    await signIn(page)
    await expect(notice(page)).toBeVisible()
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()
    expect(adsense.requests).toEqual([])

    await notice(page).getByRole('button', { name: 'Aceitar' }).click()
    await expect(notice(page)).toHaveCount(0)
    await expect(adSlot(page).getByText('Fake AdSense')).toBeVisible()
    expect(adsense.requests).toHaveLength(1)
    expect(adsense.requests[0]).toContain('client=ca-pub-0000000000000000')

    await page.reload()
    await page.getByRole('button', { name: /Continuar como/ }).click()
    await expect(adSlot(page).getByText('Fake AdSense')).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
  })

  test('"Recusar" keeps the house ad; the policy shows the choice and can change it', async ({ page }) => {
    const adsense = await installFakeAdsense(page)
    await signIn(page)
    await notice(page).getByRole('button', { name: 'Recusar' }).click()
    await expect(notice(page)).toHaveCount(0)
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()

    await page.getByRole('link', { name: 'Cookies' }).click()
    await expect(page).toHaveURL(/\/privacy#cookies$/)
    const choice = page.locator('#cookies')
    await expect(choice).toContainText('recusou os cookies de anúncios')
    await expect(choice).toBeInViewport()
    await choice.getByRole('button', { name: 'Aceitar' }).click()
    await expect(choice).toContainText('aceitou os cookies de anúncios')
    expect(adsense.requests).toEqual([]) // legal pages never load ads
  })
})

test.describe('other regions', () => {
  test.use({ timezoneId: 'America/New_York' })

  test('AdSense loads without a notice, in the files page and in the editor footer', async ({ page }) => {
    const adsense = await installFakeAdsense(page)
    await signIn(page)
    await expect(adSlot(page).getByText('Fake AdSense')).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Novo' }).click()
    await expect(page.locator('.excalidraw')).toBeVisible()
    await expect(adSlot(page).locator('ins.adsbygoogle[data-ad-slot="1111111111"]')).toHaveAttribute('data-ad-status', 'filled')
    expect(adsense.requests).toHaveLength(1) // injected once for the whole session
  })

  test('a blocked script falls back to the house ad', async ({ page }) => {
    await installFakeAdsense(page, { fail: true })
    await signIn(page)
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()
  })
})

test.describe('landing page', () => {
  test('Europe: only the house ad and no request to AdSense', async ({ page }) => {
    const adsense = await installFakeAdsense(page)
    await page.goto('/')
    await expect(adSlot(page).getByRole('link', { name: /GitHub/ })).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
    expect(adsense.requests).toEqual([])
  })

  test.describe('Brazil', () => {
    test.use({ timezoneId: 'America/Sao_Paulo' })

    test('asks first, then loads AdSense after "Aceitar"', async ({ page }) => {
      const adsense = await installFakeAdsense(page)
      await page.goto('/')
      await expect(notice(page)).toBeVisible()
      expect(adsense.requests).toEqual([])
      await notice(page).getByRole('button', { name: 'Aceitar' }).click()
      await expect(adSlot(page).getByText('Fake AdSense')).toBeVisible()
    })
  })

  test.describe('other regions', () => {
    test.use({ timezoneId: 'America/New_York' })

    test('AdSense loads without a notice', async ({ page }) => {
      await installFakeAdsense(page)
      await page.goto('/')
      await expect(adSlot(page).getByText('Fake AdSense')).toBeVisible()
      await expect(notice(page)).toHaveCount(0)
    })
  })
})

test('legal pages open without signing in, in both languages, with no ad', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible()
  await expect(adSlot(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
  await page.goto('/terms')
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible()
})

test('the editor menu leads to the cookie choice', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(page.locator('.excalidraw')).toBeVisible()
  await page.getByTestId('main-menu-trigger').click()
  await page.getByText('Privacidade e cookies').click()
  await expect(page).toHaveURL(/\/privacy#cookies$/)
})
