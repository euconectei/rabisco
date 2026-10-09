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
  whatsNew: {
    title: 'Novidades',
    intro: 'O que mudou no Rabisco recentemente, em linguagem simples.',
    back: 'Voltar',
    link: 'Novidades',
    linkUnseen: 'Novidades (há novidades)',
    menuItem: 'Novidades ({version})',
    sections: {
      launch: {
        title: 'O Rabisco chegou',
        items: [
          'Desenhe fluxos e ideias com traço à mão, num quadro sem limites.',
          'Use em português ou em inglês: o Rabisco segue o idioma do seu navegador, e você pode trocar quando quiser.',
          'Em breve: entrar com sua conta Google e guardar seus desenhos no seu Google Drive.',
        ],
      },
    },
  },
} as const

type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> }
export type Messages = DeepStrings<typeof ptBR>
