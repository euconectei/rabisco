import { decideAd, needsCookieNotice, type AdInputs } from './decision'

const base: AdInputs = { exempt: false, region: 'other', adsenseConfigured: true, consent: null }

it('waits while exemption is unknown, in any region', () => {
  for (const region of ['europe', 'brazil', 'other'] as const) expect(decideAd({ ...base, region, exempt: null })).toBe('pending')
})

it('shows nothing to exempt accounts, in any region', () => {
  for (const region of ['europe', 'brazil', 'other'] as const) expect(decideAd({ ...base, region, exempt: true })).toBe('none')
})

it('uses the house ad in Europe and when AdSense is not configured', () => {
  expect(decideAd({ ...base, region: 'europe', consent: 'accepted' })).toBe('house')
  expect(decideAd({ ...base, adsenseConfigured: false })).toBe('house')
  expect(decideAd({ ...base, region: 'brazil', adsenseConfigured: false, consent: 'accepted' })).toBe('house')
})

it('in Brazil, loads AdSense only after "Accept"', () => {
  expect(decideAd({ ...base, region: 'brazil' })).toBe('house')
  expect(decideAd({ ...base, region: 'brazil', consent: 'declined' })).toBe('house')
  expect(decideAd({ ...base, region: 'brazil', consent: 'accepted' })).toBe('adsense')
})

it('uses AdSense elsewhere, whatever the stored choice', () => {
  expect(decideAd(base)).toBe('adsense')
  expect(decideAd({ ...base, consent: 'declined' })).toBe('adsense')
})

it('asks only in Brazil, only non-exempt accounts, only with AdSense configured, only once', () => {
  expect(needsCookieNotice({ ...base, region: 'brazil' })).toBe(true)
  expect(needsCookieNotice({ ...base, region: 'brazil', consent: 'declined' })).toBe(false)
  expect(needsCookieNotice({ ...base, region: 'brazil', exempt: null })).toBe(false)
  expect(needsCookieNotice({ ...base, region: 'brazil', exempt: true })).toBe(false)
  expect(needsCookieNotice({ ...base, region: 'brazil', adsenseConfigured: false })).toBe(false)
  expect(needsCookieNotice(base)).toBe(false)
  expect(needsCookieNotice({ ...base, region: 'europe' })).toBe(false)
})
