import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  // Lisbon: outside AdSense's reach, so no test but e2e/ads.spec.ts ever asks it for anything.
  use: { baseURL: externalBaseURL ?? 'http://localhost:4173', timezoneId: 'Europe/Lisbon' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'pnpm run build && pnpm run preview --port 4173 --strictPort',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        // Test-only Google identifiers: the E2E suite answers Google's endpoints with fakes.
        // Test-only AdSense ids: e2e/fakes/adsense.ts answers the script.
        env: {
          VITE_GOOGLE_CLIENT_ID: 'test-client-id',
          VITE_GOOGLE_API_KEY: 'test-api-key',
          VITE_GOOGLE_APP_ID: '123',
          VITE_E2E: '1',
          VITE_ADSENSE_CLIENT: 'ca-pub-0000000000000000',
          VITE_ADSENSE_SLOT_EDITOR: '1111111111',
          VITE_ADSENSE_SLOT_FILES: '2222222222',
        },
      },
})
