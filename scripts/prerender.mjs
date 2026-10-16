import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { BASE_URL, LANGUAGES, renderLanding, seoFor, softwareApplicationJsonLd } from '../.prerender/prerender.js'

const DIST = resolve('dist')

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const builtHtml = readFileSync(resolve(DIST, 'index.html'), 'utf8')

const assetTags = [
  ...builtHtml.matchAll(/<link[^>]*\/assets\/[^>]*>/g),
  ...builtHtml.matchAll(/<script[^>]*\/assets\/[^>]*><\/script>/g),
]
  .map((match) => match[0])
  .join('\n    ')

const INLINE_LANG_SCRIPT = `(function () {
        var lang = null
        var path = window.location.pathname
        if (path === '/en' || path.indexOf('/en/') === 0) {
          lang = 'en'
        } else {
          try { lang = localStorage.getItem('rabisco.lang') } catch (e) {}
          if (lang !== 'pt-BR' && lang !== 'en') {
            lang = (navigator.language || '').toLowerCase().indexOf('pt') === 0 ? 'pt-BR' : 'en'
          }
        }
        document.documentElement.lang = lang
      })()`

function hreflangLinks() {
  return [
    `<link rel="alternate" hreflang="pt-BR" href="${BASE_URL}/" />`,
    `<link rel="alternate" hreflang="en" href="${BASE_URL}/en/" />`,
    `<link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`,
  ].join('\n    ')
}

function headFor(lang) {
  const seo = seoFor(lang)
  const jsonLd = softwareApplicationJsonLd(lang)
  return [
    '<meta charset="UTF-8" />',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="apple-touch-icon" href="/icons/icon-256.png" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="theme-color" content="#6965db" />',
    '<meta name="color-scheme" content="light dark" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '',
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    '<meta name="google-adsense-account" content="ca-pub-6019782051330616" />',
    `<link rel="canonical" href="${seo.url}" />`,
    '<meta name="robots" content="index, follow" />',
    '',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Rabisco" />',
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${seo.url}" />`,
    `<meta property="og:locale" content="${seo.ogLocale}" />`,
    `<meta property="og:image" content="${seo.ogImageUrl}" />`,
    '<meta property="og:image:width" content="1280" />',
    '<meta property="og:image:height" content="800" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${seo.ogImageUrl}" />`,
    '',
    hreflangLinks(),
    '',
    `<script type="application/ld+json">${jsonLd}</script>`,
    '',
    `<script>${INLINE_LANG_SCRIPT}</script>`,
    assetTags,
  ].join('\n    ')
}

for (const lang of LANGUAGES) {
  const body = renderLanding(lang)
  const html = `<!doctype html>
<html lang="${lang}">
  <head>
    ${headFor(lang)}
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>
`
  const outPath = resolve(DIST, lang === 'en' ? 'en/index.html' : 'index.html')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html)
}

console.log(`prerendered landing for: ${LANGUAGES.join(', ')}`)
