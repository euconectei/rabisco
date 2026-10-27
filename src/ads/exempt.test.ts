import { EXEMPT_HASHES, hashEmail, isExempt, normalizeEmail } from './exempt'

// SHA-256 of "ana@example.com".
const ANA = '8e43ca37701228e74983efdbd0cff5c16b3b1e5d4e29a7c05626d4d25a018e11'

it('normalizes before hashing', async () => {
  expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com')
  expect(await hashEmail('  Ana@Example.COM ')).toBe(ANA)
})

it('starts with the owner on the list', async () => {
  expect(EXEMPT_HASHES).toContain(await hashEmail('rafaelfms@gmail.com'))
})

it('exempts only listed accounts', async () => {
  expect(await isExempt('ana@example.com', [ANA])).toBe(true)
  expect(await isExempt('bia@example.com', [ANA])).toBe(false)
})

it('treats the account as not exempt when hashing fails', async () => {
  const spy = vi.spyOn(crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no subtle'))
  expect(await isExempt('ana@example.com', [ANA])).toBe(false)
  spy.mockRestore()
})
