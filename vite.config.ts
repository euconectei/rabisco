/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  plugins: [react()],
  define: {
    // Required by @excalidraw/excalidraw when bundled with Vite.
    'process.env.IS_PREACT': JSON.stringify('false'),
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Excalidraw imports JSON without import attributes; let Vite transform it instead of Node.
    server: { deps: { inline: ['@excalidraw/excalidraw'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/global.d.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
})
