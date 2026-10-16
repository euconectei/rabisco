// Copies Excalidraw fonts into public/ so the editor never fetches them from a third-party CDN.
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../node_modules/@excalidraw/excalidraw/dist/prod/fonts', import.meta.url))
const target = fileURLToPath(new URL('../public/excalidraw-assets/fonts', import.meta.url))

if (!existsSync(source)) {
  console.error(`Excalidraw fonts not found at ${source}. Did the package layout change?`)
  process.exit(1)
}
rmSync(target, { recursive: true, force: true })
cpSync(source, target, { recursive: true })
console.log('Excalidraw fonts copied to public/excalidraw-assets/fonts')

// src/index.css (the landing page titles) and the kids page (public/kids, its title and offline
// cache) name Excalidraw font files directly; a package update renames them, so fail the build
// instead of shipping a page that silently falls back.
const css = ['../src/index.css', '../public/kids/index.html', '../public/kids/sw.js']
  .map((file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8'))
  .join('\n')
const missing = [...css.matchAll(/\/excalidraw-assets\/fonts\/([\w/.-]+\.woff2)/g)]
  .map((match) => match[1])
  .filter((file) => !existsSync(`${target}/${file}`))
if (missing.length > 0) {
  console.error(`src/index.css points at Excalidraw fonts that no longer exist: ${missing.join(', ')}`)
  process.exit(1)
}
