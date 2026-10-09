export const ptBR = {
  app: {
    name: 'Rabisco',
    tagline: 'Mapas mentais e fluxos à mão no mesmo canvas, salvos no seu Google Drive.',
  },
  landing: { start: 'Começar' },
  files: { title: 'Meus arquivos', empty: 'Nenhum arquivo ainda.', new: 'Novo' },
  editor: { backToFiles: 'Meus arquivos', loading: 'Carregando o editor…' },
  notFound: { title: 'Página não encontrada', backHome: 'Voltar ao início' },
  language: { label: 'Idioma', 'pt-BR': 'Português', en: 'English' },
} as const

type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> }
export type Messages = DeepStrings<typeof ptBR>
