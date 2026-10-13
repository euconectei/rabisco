beforeEach(() => {
  vi.resetModules()
  document.head.innerHTML = ''
  delete window.adsbygoogle
})

async function load() {
  return import('./adsense')
}

it('injects the script once, with the client, async and anonymous', async () => {
  const { loadAdsense } = await load()
  const first = loadAdsense('ca-pub-1')
  const second = loadAdsense('ca-pub-1')
  expect(second).toBe(first)
  const scripts = document.head.querySelectorAll('script')
  expect(scripts).toHaveLength(1)
  expect(scripts[0].src).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1')
  expect(scripts[0].async).toBe(true)
  expect(scripts[0].crossOrigin).toBe('anonymous')
  scripts[0].dispatchEvent(new Event('load'))
  await expect(first).resolves.toBeUndefined()
})

it('rejects when the script fails, and does not retry', async () => {
  const { loadAdsense } = await load()
  const attempt = loadAdsense('ca-pub-1')
  document.head.querySelector('script')!.dispatchEvent(new Event('error'))
  await expect(attempt).rejects.toThrow()
  await expect(loadAdsense('ca-pub-1')).rejects.toThrow()
  expect(document.head.querySelectorAll('script')).toHaveLength(1)
})

it('pushes each <ins> only once', async () => {
  const { pushAd } = await load()
  const ins = document.createElement('ins')
  pushAd(ins)
  pushAd(ins)
  pushAd(document.createElement('ins'))
  expect(window.adsbygoogle).toHaveLength(2)
})
