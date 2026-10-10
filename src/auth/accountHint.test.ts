import { clearAccountHint, readAccountHint, writeAccountHint } from './accountHint'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('round-trips name and email only', () => {
  writeAccountHint({ email: 'ana@example.com', name: 'Ana' })
  expect(readAccountHint()).toEqual({ email: 'ana@example.com', name: 'Ana' })
  expect(JSON.parse(localStorage.getItem('rabisco.account')!)).toEqual({ email: 'ana@example.com', name: 'Ana' })
})

it('ignores broken or incomplete values', () => {
  for (const bad of ['{', '"x"', '{"name":"Ana"}', '{"email":42,"name":"Ana"}', 'null']) {
    localStorage.setItem('rabisco.account', bad)
    expect(readAccountHint()).toBeNull()
  }
})

it('clears the hint', () => {
  writeAccountHint({ email: 'ana@example.com', name: 'Ana' })
  clearAccountHint()
  expect(readAccountHint()).toBeNull()
})

it('survives storage that throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError') })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('SecurityError') })
  expect(readAccountHint()).toBeNull()
  expect(() => writeAccountHint({ email: 'a@b.c', name: 'A' })).not.toThrow()
  expect(() => clearAccountHint()).not.toThrow()
})
