// Generates the template preview images in public/templates/ (`pnpm screenshots:templates`): each template
// opened in the real editor, without an account, exactly as "Use this template" opens it. Run it by hand
// when a template or the editor's look changes and commit the images; it is not part of CI.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { TEMPLATES } from '../../src/templates/registry'

const OUT = join(process.cwd(), 'public/templates')
mkdirSync(OUT, { recursive: true })

const SAVED = { 'pt-BR': /^Salvo/, en: /^Saved/ } as const

/**
 * Saves a PNG screenshot as WebP, cropped to the drawing plus a margin, so tall flowcharts and wide maps
 * both fill their picture. Converted by the browser (no image tooling needed).
 */
async function saveWebp(page: Page, png: Buffer, name: string) {
  const dataUrl = await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const source = document.createElement('canvas')
    source.width = image.naturalWidth
    source.height = image.naturalHeight
    const context = source.getContext('2d')!
    context.drawImage(image, 0, 0)
    const { data, width, height } = context.getImageData(0, 0, source.width, source.height)
    let [left, top, right, bottom] = [width, height, 0, 0]
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
      }
    }
    const margin = Math.round(width * 0.03)
    left = Math.max(0, left - margin)
    top = Math.max(0, top - margin)
    right = Math.min(width, right + margin)
    bottom = Math.min(height, bottom + margin)
    const cropped = document.createElement('canvas')
    cropped.width = right - left
    cropped.height = bottom - top
    const out = cropped.getContext('2d')!
    out.fillStyle = '#ffffff'
    out.fillRect(0, 0, cropped.width, cropped.height)
    out.drawImage(source, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
    return cropped.toDataURL('image/webp', 0.82)
  }, png.toString('base64'))
  writeFileSync(join(OUT, `${name}.webp`), Buffer.from(dataUrl.split(',')[1], 'base64'))
}

for (const lang of ['pt-BR', 'en'] as const) {
  test.describe(lang, () => {
    test.use({ locale: lang, colorScheme: 'light', viewport: { width: 1200, height: 750 }, deviceScaleFactor: 2 })

    for (const template of TEMPLATES.filter((item) => item.locales[lang])) {
      test(template.id, async ({ page }) => {
        await page.addInitScript((code) => localStorage.setItem('rabisco.lang', code), lang)
        await page.goto(`/edit/new?template=${template.id}`)
        await expect(page).toHaveURL(/\/edit\/local-/, { timeout: 20_000 })
        await expect(page.locator('.excalidraw')).toBeVisible()
        await expect(page.getByRole('status').filter({ hasText: SAVED[lang] })).toBeVisible({ timeout: 15_000 })
        // Only the drawing: no toolbars, menus, title, notices or hints.
        await page.addStyleTag({
          content: '.layer-ui__wrapper, .title-field, .save-status, .local-notice, .HintViewer, .touch-toolbar, .ad-slot { display: none !important; }',
        })
        await page.mouse.click(1190, 740)
        await page.keyboard.press('Escape')
        await page.keyboard.press('Shift+1') // zoom to fit
        await page.waitForTimeout(600)
        await saveWebp(page, await page.screenshot(), `${template.id}.${lang}`)
      })
    }
  })
}
