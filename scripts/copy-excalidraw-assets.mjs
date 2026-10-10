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

// src/index.css names Excalidraw font files directly (the landing page titles); a package update
// renames them, so fail the build instead of shipping a page that silently falls back.
const css = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8')
const missing = [...css.matchAll(/\/excalidraw-assets\/fonts\/([\w/.-]+\.woff2)/g)]
  .map((match) => match[1])
  .filter((file) => !existsSync(`${target}/${file}`))
if (missing.length > 0) {
  console.error(`src/index.css points at Excalidraw fonts that no longer exist: ${missing.join(', ')}`)
  process.exit(1)
}
