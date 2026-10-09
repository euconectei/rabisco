import { googleConfig } from './config'

const full = { VITE_GOOGLE_CLIENT_ID: 'cid', VITE_GOOGLE_API_KEY: 'key', VITE_GOOGLE_APP_ID: '123' }

it('returns the Google config when every value is present', () => {
  expect(googleConfig(full)).toEqual({ clientId: 'cid', apiKey: 'key', appId: '123' })
})

it.each(['VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_API_KEY', 'VITE_GOOGLE_APP_ID'])('returns null when %s is missing or blank', (key) => {
  expect(googleConfig({ ...full, [key]: undefined })).toBeNull()
  expect(googleConfig({ ...full, [key]: '  ' })).toBeNull()
})
