import { expect, test, type Page } from '@playwright/test'
import { installFakeGoogle } from './fakes/google'

// Cloudflare Web Analytics, injected by the proxy in production (accepted: cookieless page views).
// Google sign-in and APIs (answered by fakes in this suite).
const ALLOWED_THIRD_PARTY_HOSTS = [
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
  'accounts.google.com',
  'apis.google.com',
  'www.googleapis.com',
  'content.googleapis.com',
  'docs.google.com',
]

function trackThirdPartyRequests(page: Page, baseURL: string): string[] {
  const ownHost = new URL(baseURL).host
  const external: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!url.protocol.startsWith('http') || url.host === ownHost) return
    if (ALLOWED_THIRD_PARTY_HOSTS.includes(url.host)) return
    external.push(request.url())
  })
  return external
}

test.beforeEach(async ({ page }) => {
  await installFakeGoogle(page)
})

test.describe('pt-BR browser', () => {
  test.use({ locale: 'pt-BR' })

  test('landing → files → editor, switch to English, no third-party requests', async ({ page, baseURL }) => {
    const external = trackThirdPartyRequests(page, baseURL!)
    await page.goto('/')
    await page.getByRole('link', { name: 'Começar' }).click()
    await page.getByRole('button', { name: 'Entrar com Google' }).click()
    await page.getByRole('button', { name: 'Novo' }).click()
    await expect(page.locator('.excalidraw')).toBeVisible()

    // Typing text forces the hand-drawn canvas font (Excalifont) to load.
    await page.mouse.dblclick(600, 300)
    await page.keyboard.type('Rabisco à mão')
    await page.keyboard.press('Escape')

    await page.getByTestId('main-menu-trigger').click()
    await page.getByText('English').click()
    await page.getByTestId('main-menu-trigger').click()
    await expect(page.getByText('My files')).toBeVisible()
    await page.keyboard.press('Escape')

    // The text typed before the switch is still on the canvas: Excalidraw was not remounted.
    await expect(page.getByTestId('button-undo')).toBeEnabled()

    await page.waitForLoadState('networkidle')
    expect(external).toEqual([])
  })
})

test.describe('English browser', () => {
  test.use({ locale: 'en-US' })

  test('deep link to the editor loads directly', async ({ page }) => {
    await page.goto('/edit/new')
    await page.getByRole('button', { name: 'Sign in with Google' }).click()
    await expect(page.locator('.excalidraw')).toBeVisible()
  })

  test('sets <html lang> before the app bundle runs', async ({ page }) => {
    await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort())
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('footer shows the version and opens the news page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/^v\d+\.\d+\.\d+$/)).toBeVisible()
    await page.getByRole('link', { name: 'News (something new)' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Rabisco is here' })).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('link', { name: 'News', exact: true })).toBeVisible()
  })

  test('landing is in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible()
  })
})
