import { adsenseConfig } from './config'

const FULL = { VITE_ADSENSE_CLIENT: ' ca-pub-1 ', VITE_ADSENSE_SLOT_EDITOR: '11', VITE_ADSENSE_SLOT_FILES: '22' }

it('reads the publisher and the two slots, trimmed', () => {
  expect(adsenseConfig(FULL)).toEqual({ client: 'ca-pub-1', slots: { editor: '11', files: '22' } })
})

it('is not configured when any value is missing or blank', () => {
  expect(adsenseConfig({})).toBeNull()
  expect(adsenseConfig({ ...FULL, VITE_ADSENSE_SLOT_FILES: ' ' })).toBeNull()
  expect(adsenseConfig({ ...FULL, VITE_ADSENSE_CLIENT: undefined })).toBeNull()
})
