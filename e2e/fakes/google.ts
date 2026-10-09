import type { Page } from '@playwright/test'

export const FAKE_TOKEN = 'fake-token'
export const FAKE_USER = { email: 'tester@example.com', name: 'Tester' }

// Stands in for Google Identity Services: requestAccessToken answers with a fixed token.
const FAKE_GIS_SCRIPT = `
window.google = window.google || {};
window.google.accounts = {
  oauth2: {
    initTokenClient: function (config) {
      return {
        requestAccessToken: function () {
          setTimeout(function () { config.callback({ access_token: '${FAKE_TOKEN}', expires_in: 3600 }) }, 0)
        },
      }
    },
    revoke: function (_token, done) { done() },
  },
};
`

export async function installFakeGoogle(page: Page): Promise<void> {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_GIS_SCRIPT }),
  )
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) => {
    const authorized = route.request().headers().authorization === `Bearer ${FAKE_TOKEN}`
    return authorized
      ? route.fulfill({ json: FAKE_USER })
      : route.fulfill({ status: 401, json: { error: 'invalid_token' } })
  })
}
