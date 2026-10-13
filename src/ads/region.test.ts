import { adRegion, browserTimeZone } from './region'

it.each([
  ['Europe/Lisbon', 'europe'],
  ['Europe/Moscow', 'europe'],
  ['Atlantic/Canary', 'europe'],
  ['Atlantic/Azores', 'europe'],
  ['Atlantic/Reykjavik', 'europe'],
  ['Arctic/Longyearbyen', 'europe'],
  ['Asia/Nicosia', 'europe'],
  ['Asia/Famagusta', 'europe'],
  ['America/Sao_Paulo', 'brazil'],
  ['America/Noronha', 'brazil'],
  ['America/Rio_Branco', 'brazil'],
  ['Brazil/East', 'brazil'],
  ['America/New_York', 'other'],
  ['America/Argentina/Buenos_Aires', 'other'],
  ['Asia/Tokyo', 'other'],
  ['UTC', 'other'],
] as const)('%s → %s', (timeZone, region) => {
  expect(adRegion(timeZone)).toBe(region)
})

it('treats a missing time zone as Europe, the safe side', () => {
  expect(adRegion(undefined)).toBe('europe')
  expect(adRegion('')).toBe('europe')
})

it('reads the browser time zone, and gives up quietly when Intl throws', () => {
  expect(typeof browserTimeZone()).toBe('string')
  const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
    throw new Error('no Intl')
  })
  expect(browserTimeZone()).toBeUndefined()
  spy.mockRestore()
})
