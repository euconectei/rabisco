import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

// `pnpm screenshots`: regenerates public/landing/*.webp (see scripts/screenshots/landing.spec.ts).
export default defineConfig({
  ...base,
  testDir: 'scripts/screenshots',
  workers: 1,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
