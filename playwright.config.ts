import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: externalBaseURL ?? 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'pnpm run build && pnpm run preview --port 4173 --strictPort',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        // Test-only Google identifiers: the E2E suite answers Google's endpoints with fakes.
        env: { VITE_GOOGLE_CLIENT_ID: 'test-client-id', VITE_GOOGLE_API_KEY: 'test-api-key', VITE_GOOGLE_APP_ID: '123' },
      },
})
