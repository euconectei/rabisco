import { MESSAGES } from './messages'

function keyPaths(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keyPaths(v as object, `${prefix}${k}.`),
  )
}

it('has the same keys in every language, all non-empty', () => {
  const pt = keyPaths(MESSAGES['pt-BR']).sort()
  const en = keyPaths(MESSAGES.en).sort()
  expect(en).toEqual(pt)
  for (const lang of Object.values(MESSAGES)) {
    for (const path of keyPaths(lang)) {
      const value = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], lang)
      expect(value, path).not.toBe('')
    }
  }
})
