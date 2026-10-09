import { expect, test, type Page } from '@playwright/test'

// Cloudflare Web Analytics, injected by the proxy in production (accepted: cookieless page views).
const ALLOWED_THIRD_PARTY_HOSTS = ['static.cloudflareinsights.com', 'cloudflareinsights.com']

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

test.describe('pt-BR browser', () => {
  test.use({ locale: 'pt-BR' })

  test('landing → files → editor, switch to English, no third-party requests', async ({ page, baseURL }) => {
    const external = trackThirdPartyRequests(page, baseURL!)
    await page.goto('/')
    await page.getByRole('link', { name: 'Começar' }).click()
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
    await expect(page.locator('.excalidraw')).toBeVisible()
  })

  test('landing is in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible()
  })
})
