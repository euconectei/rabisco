// Copies Excalidraw fonts into public/ so the editor never fetches them from a third-party CDN.
import { cpSync, existsSync, rmSync } from 'node:fs'
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
