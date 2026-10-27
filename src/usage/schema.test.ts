import { parseUsageEvent, toDataPoint } from './schema'

const known = ['revolucao-francesa']
const created = { type: 'drawing_created', source: 'template', template: 'revolucao-francesa', mode: 'local', lang: 'pt-BR' }
const returned = { type: 'drawing_returned', template: null, mode: 'google', lang: 'en' }

it('accepts each known event as it is', () => {
  expect(parseUsageEvent(created, known)).toEqual(created)
  expect(parseUsageEvent(returned, known)).toEqual(returned)
  expect(parseUsageEvent({ ...created, source: 'blank', template: null }, known)).toEqual({ ...created, source: 'blank', template: null })
})

it.each([
  ['an unknown type', { ...returned, type: 'page_view' }],
  ['an unknown source', { ...created, source: 'paste' }],
  ['an unknown template', { ...created, template: 'nao-existe' }],
  ['a template that is not a string', { ...created, template: 42 }],
  ['a template without the template source', { ...created, source: 'blank' }],
  ['the template source without a template', { ...created, template: null }],
  ['an unknown mode', { ...returned, mode: 'drive' }],
  ['an unknown language', { ...returned, lang: 'es' }],
  ['an extra field', { ...returned, id: 'local-123' }],
  ['a missing field', { type: 'drawing_returned', mode: 'local', lang: 'en' }],
  ['a source on a return', { ...returned, source: 'blank' }],
  ['a long string', { ...returned, lang: 'x'.repeat(100) }],
  ['null', null],
  ['an array', [returned]],
  ['a string', JSON.stringify(returned)],
])('refuses %s', (_case, body) => {
  expect(parseUsageEvent(body, known)).toBeNull()
})

it('writes events as rows with fixed columns', () => {
  expect(toDataPoint(created as never)).toEqual({
    indexes: ['drawing_created'],
    blobs: ['drawing_created', 'template', 'revolucao-francesa', 'local', 'pt-BR'],
    doubles: [1],
  })
  expect(toDataPoint(returned as never).blobs).toEqual(['drawing_returned', '', '', 'google', 'en'])
})
