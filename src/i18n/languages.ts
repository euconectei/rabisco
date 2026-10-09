export const LANGUAGES = ['pt-BR', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

export function detectLanguage(navigatorLanguage: string | undefined): Language {
  return navigatorLanguage?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}
