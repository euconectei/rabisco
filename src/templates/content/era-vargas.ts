import type { Template } from '../types'

export const eraVargas: Template = {
  id: 'era-vargas',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['segunda-guerra', 'resumo'],
  locales: {
    'pt-BR': {
      slug: 'era-vargas',
      title: 'Mapa mental da Era Vargas',
      description:
        'Mapa mental da Era Vargas (1930–1945): Governo Provisório, Constitucional e Estado Novo, com datas, personagens e dicas de estudo. Grátis e sem cadastro.',
      intro:
        'A Era Vargas (1930–1945) foi o período em que Getúlio Vargas governou o Brasil e mudou a política, a economia e as relações de trabalho do país. O assunto aparece com frequência no ENEM e nos vestibulares porque conecta o fim da República Velha, a industrialização e a entrada do Brasil na Segunda Guerra Mundial. Este mapa mental organiza o conteúdo em três governos, na queda de Vargas e no legado do período.',
      sections: [
        {
          heading: 'Governo Provisório (1930–1934)',
          paragraphs: [
            'Vargas assumiu o poder em 3 de novembro de 1930, depois da Revolução de 1930, que derrubou Washington Luís e encerrou a política do café com leite. No Governo Provisório, ele dissolveu o Congresso, governou por decreto e nomeou interventores para os estados, enfraquecendo as oligarquias regionais.',
            'Nessa fase foram criados o Ministério do Trabalho e leis que regulavam jornada, férias e sindicatos. Em 1932, São Paulo se levantou na Revolução Constitucionalista, pedindo nova Constituição e eleições. O governo venceu o conflito, mas convocou uma Assembleia Constituinte. A Constituição de 1934 incorporou o voto secreto, o voto feminino e a Justiça Eleitoral, criados pelo Código Eleitoral de 1932.',
          ],
        },
        {
          heading: 'Governo Constitucional (1934–1937)',
          paragraphs: [
            'No Governo Constitucional, Vargas foi eleito indiretamente pela Assembleia Constituinte. O país vivia a disputa entre a Ação Integralista Brasileira, de inspiração fascista, e a Aliança Nacional Libertadora, ligada à esquerda.',
            'Em 1935, a Intentona Comunista, revolta de militares liderada por Luís Carlos Prestes, foi reprimida e serviu de justificativa para o estado de guerra e para prisões de opositores. Em 1937, o falso Plano Cohen, que anunciava uma conspiração comunista, deu o pretexto para o golpe de 10 de novembro, que fechou o Congresso e implantou o Estado Novo.',
          ],
        },
        {
          heading: 'Estado Novo (1937–1945)',
          paragraphs: [
            'O Estado Novo foi uma ditadura: a Constituição de 1937 concentrou poderes no Executivo, os partidos foram extintos e o Departamento de Imprensa e Propaganda (DIP) passou a censurar jornais, rádio e cinema. A polícia política prendeu e torturou opositores, entre eles Prestes.',
            'Na economia, o Estado investiu na indústria de base, com a Companhia Siderúrgica Nacional (1941) e a Companhia Vale do Rio Doce (1942), e incentivou a ocupação do interior na Marcha para o Oeste. Em 1943, a Consolidação das Leis do Trabalho (CLT) reuniu os direitos dos trabalhadores urbanos, ao mesmo tempo que os sindicatos ficavam submetidos ao governo.',
            'Na Segunda Guerra, o Brasil apoiou os Aliados, declarou guerra ao Eixo em 1942 e enviou a Força Expedicionária Brasileira (FEB) à Itália em 1944. Pressionado por militares e pela oposição, Vargas foi deposto em 29 de outubro de 1945.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Comece comparando os três governos: quem escolhia o presidente, qual Constituição valia e quais direitos existiam em cada fase. Depois cubra os ramos e recite as datas de 1930, 1932, 1935, 1937 e 1945 em voz alta. Por fim, escreva de memória um parágrafo ligando industrialização, CLT e Segunda Guerra; se travar, volte ao ramo correspondente antes de tentar de novo.',
          ],
        },
      ],
      source: `- Era Vargas (1930–1945)
  - Governo Provisório (1930–1934)
    - Revolução de 1930
    - Fim da República Velha
    - Leis trabalhistas iniciais
    - Revolução de 1932
  - Governo Constitucional (1934–1937)
    - Constituição de 1934
    - AIB e ANL
    - Intentona Comunista (1935)
    - Plano Cohen e golpe
  - Estado Novo (1937–1945)
    - Ditadura e censura (DIP)
    - CSN e Vale do Rio Doce
    - CLT em 1943
    - Entrada na Segunda Guerra
  - Queda de Vargas
    - FEB na Itália
    - Pressão militar
    - Deposição em 1945
  - Legado
    - Trabalhismo e sindicatos
    - Voto secreto e feminino
    - Industrialização
    - Justiça Eleitoral
`,
      imageAlt:
        'Mapa mental da Era Vargas com ramos sobre Governo Provisório, Governo Constitucional, Estado Novo, queda de Vargas e legado',
    },
  },
}
