import { detectLanguage, isLanguage } from './languages'

describe('detectLanguage', () => {
  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['PT-br', 'pt-BR'],
    ['en-US', 'en'],
    ['es', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('maps %s to %s', (input, expected) => {
    expect(detectLanguage(input)).toBe(expected)
  })
})

describe('isLanguage', () => {
  it('accepts supported languages only', () => {
    expect(isLanguage('pt-BR')).toBe(true)
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage('')).toBe(false)
    expect(isLanguage(null)).toBe(false)
    expect(isLanguage('{"lang":"en"}')).toBe(false)
  })
})
