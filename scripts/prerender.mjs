import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  BASE_URL,
  LANGUAGES,
  renderKidsApp,
  renderKidsPrivacy,
  renderLanding,
  renderSupport,
  renderWhatsNew,
  seoFor,
  secondaryPageSeo,
  softwareApplicationJsonLd,
} from '../.prerender/prerender.js'

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

function headFor(meta) {
  const parts = [
    '<meta charset="UTF-8" />',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="apple-touch-icon" href="/icons/icon-256.png" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="theme-color" content="#6965db" />',
    '<meta name="color-scheme" content="light dark" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '',
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    '<meta name="google-adsense-account" content="ca-pub-6019782051330616" />',
    `<link rel="canonical" href="${meta.url}" />`,
    '<meta name="robots" content="index, follow" />',
    '',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Rabisco" />',
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:locale" content="${meta.ogLocale}" />`,
    `<meta property="og:image" content="${meta.ogImageUrl}" />`,
    '<meta property="og:image:width" content="1280" />',
    '<meta property="og:image:height" content="800" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.ogImageUrl}" />`,
  ]
  if (meta.hreflang) {
    parts.push(
      '',
      `<link rel="alternate" hreflang="pt-BR" href="${BASE_URL}/" />`,
      `<link rel="alternate" hreflang="en" href="${BASE_URL}/en/" />`,
      `<link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`,
    )
  }
  if (meta.jsonLd) {
    parts.push('', `<script type="application/ld+json">${meta.jsonLd}</script>`)
  }
  parts.push('', `<script>${INLINE_LANG_SCRIPT}</script>`, assetTags)
  return parts.join('\n    ')
}

function pageHtml(lang, body, meta) {
  return `<!doctype html>
<html lang="${lang}">
  <head>
    ${headFor(meta)}
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>
`
}

function writeHtml(filePath, html) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, html)
}

// Landing: one file per language (hreflang + JSON-LD).
for (const lang of LANGUAGES) {
  const seo = seoFor(lang)
  writeHtml(
    resolve(DIST, lang === 'en' ? 'en/index.html' : 'index.html'),
    pageHtml(lang, renderLanding(lang), { ...seo, hreflang: true, jsonLd: softwareApplicationJsonLd(lang) }),
  )
}

// Secondary public pages: pt-BR only (no language-paired URL).
const secondary = [
  { path: 'whats-new', render: renderWhatsNew, seo: secondaryPageSeo('whats-new') },
  { path: 'apoie', render: renderSupport, seo: secondaryPageSeo('apoie') },
  { path: 'rabisco-kids', render: renderKidsApp, seo: secondaryPageSeo('rabisco-kids') },
  { path: 'rabisco-kids/privacy', render: renderKidsPrivacy, seo: secondaryPageSeo('rabisco-kids/privacy') },
]
for (const page of secondary) {
  writeHtml(resolve(DIST, `${page.path}/index.html`), pageHtml('pt-BR', page.render('pt-BR'), page.seo))
}

console.log(`prerendered landing for: ${LANGUAGES.join(', ')} and pages: ${secondary.map((p) => p.path).join(', ')}`)
