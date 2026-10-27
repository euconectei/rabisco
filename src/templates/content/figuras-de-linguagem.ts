import type { Template } from '../types'

export const figurasDeLinguagem: Template = {
  id: 'figuras-de-linguagem',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['resumo'],
  locales: {
    'pt-BR': {
      slug: 'figuras-de-linguagem',
      title: 'Mapa mental de figuras de linguagem',
      description:
        'Mapa mental de figuras de linguagem: figuras de palavra, de pensamento, de sintaxe e de som, com um exemplo curto de cada uma.',
      intro:
        'Figuras de linguagem são recursos de expressão que alteram o sentido literal das palavras e aparecem na literatura, na publicidade e na fala do dia a dia. A BNCC cobra o reconhecimento e o uso dessas figuras no ensino médio, e as provas costumam pedir a identificação do recurso em um trecho. Este mapa mental organiza o conteúdo em quatro grupos: figuras de palavra, de pensamento, de sintaxe e de som, cada um com exemplos curtos.',
      sections: [
        {
          heading: 'Figuras de palavra',
          paragraphs: [
            'As figuras de palavra mexem no significado dos termos. A metáfora compara sem conectivo: "meu coração é um deserto". A comparação usa um elemento de ligação explícito: "ele é forte como um touro". A metonímia troca um termo por outro ligado a ele: "li Machado de Assis" (a obra pelo autor). A catacrese usa uma palavra já desgastada por falta de termo próprio: "pé da mesa". A sinestesia mistura sentidos: "voz doce".',
          ],
        },
        {
          heading: 'Figuras de pensamento',
          paragraphs: [
            'Essas figuras trabalham com ideias e com a relação entre elas. A hipérbole exagera de propósito: "chorei rios de lágrimas". O eufemismo suaviza: "ele passou desta para melhor". A ironia diz o contrário do que se quer expressar: "que belo trabalho", dito de algo ruim. A personificação dá vida ao que não tem: "o vento sussurrava". A antítese aproxima ideias opostas: "ele vive entre o céu e o inferno". O paradoxo une ideias que parecem se excluir: "é ferida que dói e não se sente".',
          ],
        },
        {
          heading: 'Figuras de sintaxe',
          paragraphs: [
            'Também chamadas de figuras de construção, mexem na ordem ou na repetição dos termos. A elipse omite um termo que o contexto já esclarece: "no meu quarto, livros por toda parte". O pleonasmo repete a ideia: "subir para cima". A anáfora repete palavras no início de versos ou frases: "tudo é rio, tudo é mar". O hipérbato inverte a ordem natural: "deitado eternamente em berço esplêndido". A silepse concorda pela ideia, não pela forma gramatical: em "os brasileiros somos otimistas", o verbo concorda com quem fala, que se inclui no grupo.',
          ],
        },
        {
          heading: 'Figuras de som',
          paragraphs: [
            'Também chamadas de figuras sonoras, exploram o som das palavras. A aliteração repete consoantes: "o rato roeu a roupa do rei". A assonância repete vogais: "Ó Formas alvas, brancas, Formas claras", de Cruz e Sousa. A onomatopeia imita um som: "toc, toc" na porta. A paronomásia aproxima palavras de som parecido: "quem casa quer casa".',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Não decore a lista de nomes: associe cada figura a um exemplo curto que você mesmo criou, porque o exemplo funciona como âncora de memória. Depois feche o mapa e tente explicar, de cabeça, a diferença entre pares que costumam se confundir, como metáfora e comparação, ou antítese e paradoxo. Abra de novo apenas para conferir o que ficou faltando.',
          ],
        },
      ],
      source: `- Figuras de linguagem
  - Palavra
    - Metáfora e comparação
    - Metonímia e catacrese
    - Sinestesia
  - Pensamento
    - Hipérbole e eufemismo
    - Ironia
    - Personificação
    - Antítese e paradoxo
  - Sintaxe
    - Elipse e pleonasmo
    - Anáfora
    - Hipérbato e silepse
  - Som
    - Aliteração e assonância
    - Onomatopeia
    - Paronomásia
`,
      imageAlt:
        'Mapa mental de figuras de linguagem com ramos para figuras de palavra, de pensamento, de sintaxe e de som',
    },
  },
}
