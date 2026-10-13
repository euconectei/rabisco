import type { Page } from '@playwright/test'

export const ADSENSE_HOST = 'pagead2.googlesyndication.com'

// Stands in for adsbygoogle.js: fills every pushed <ins> with a visible fake ad.
const FAKE_SCRIPT = `(function () {
  function fill() {
    document.querySelectorAll('ins.adsbygoogle:not([data-ad-status])').forEach(function (ins) {
      ins.setAttribute('data-ad-status', 'filled')
      ins.textContent = 'Fake AdSense'
    })
  }
  var queued = window.adsbygoogle || []
  window.adsbygoogle = { push: function () { fill() } }
  if (queued.length) fill()
})()`

/** Answers (or blocks) the AdSense script and records every request to its host. */
export async function installFakeAdsense(page: Page, { fail = false } = {}): Promise<{ requests: string[] }> {
  const requests: string[] = []
  await page.route(`https://${ADSENSE_HOST}/**`, (route) => {
    requests.push(route.request().url())
    return fail ? route.abort('blockedbyclient') : route.fulfill({ contentType: 'text/javascript', body: FAKE_SCRIPT })
  })
  return { requests }
}
