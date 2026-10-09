/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Required by @excalidraw/excalidraw when bundled with Vite.
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/global.d.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
})
