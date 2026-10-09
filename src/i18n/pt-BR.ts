export const ptBR = {
  app: {
    name: 'Rabisco',
    tagline: 'Mapas mentais e fluxos à mão no mesmo canvas, salvos no seu Google Drive.',
  },
  landing: { start: 'Começar' },
  files: { title: 'Meus arquivos', empty: 'Nenhum arquivo ainda.', new: 'Novo', untitled: 'Sem título' },
  editor: {
    backToFiles: 'Meus arquivos',
    loading: 'Carregando o editor…',
    opening: 'Abrindo o desenho…',
    creating: 'Criando um desenho novo…',
    createFailed: 'Não foi possível criar o desenho.',
    titleLabel: 'Nome do desenho',
    copySuffix: ' (cópia)',
    retry: 'Tentar de novo',
    saveAsNew: 'Salvar como novo arquivo',
    errors: {
      notFound: 'Não encontramos este desenho no seu Drive.',
      forbidden: 'Você não tem acesso a este desenho.',
      invalidFile: 'Este arquivo não é um desenho do Excalidraw.',
      network: 'Sem conexão. Verifique sua internet e tente de novo.',
      unknown: 'Não foi possível abrir este desenho.',
    },
    status: {
      saved: 'Salvo',
      saving: 'Salvando…',
      pending: 'Alterações pendentes',
      offline: 'Sem conexão — salvaremos quando ela voltar.',
      conflict: 'Escolha qual versão manter.',
      needsAuth: 'Sessão expirada — reconecte para salvar.',
      error: 'Não foi possível salvar.',
      lost: 'Este desenho não está mais acessível no seu Drive.',
    },
    conflict: {
      title: 'Este desenho mudou em outro lugar',
      body: 'O arquivo foi alterado no Drive depois que você o abriu (em outra aba ou em outro aparelho).',
      keepMine: 'Manter a minha versão',
      useRemote: 'Usar a do Drive',
    },
    draft: {
      title: 'Alterações não salvas',
      body: 'Há alterações deste desenho que não chegaram ao Drive. Quer restaurá-las?',
      restore: 'Restaurar',
      discard: 'Descartar',
    },
  },
  notFound: { title: 'Página não encontrada', backHome: 'Voltar ao início' },
  language: { label: 'Idioma', 'pt-BR': 'Português', en: 'English' },
  auth: {
    signIn: 'Entrar com Google',
    continueAs: 'Continuar como {name}',
    otherAccount: 'Usar outra conta',
    signingIn: 'Entrando…',
    unavailable: 'Login indisponível neste ambiente.',
    failed: 'Não foi possível entrar. Tente de novo.',
    reconnectBanner: 'Sua sessão com o Google expirou. Suas alterações estão guardadas neste navegador.',
    reconnect: 'Reconectar',
    signOut: 'Sair',
  },
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
