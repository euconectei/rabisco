import { format } from './format'

it('fills placeholders and leaves unknown ones untouched', () => {
  expect(format('News ({version})', { version: 'v0.2.0' })).toBe('News (v0.2.0)')
  expect(format('Hi {name}, {missing}', { name: 'Ana' })).toBe('Hi Ana, {missing}')
})
