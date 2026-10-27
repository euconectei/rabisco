import type { Template } from '../types'

export const resumo: Template = {
  id: 'resumo',
  kind: 'structure',
  diagram: 'mindmap',
  category: 'study',
  related: ['mapa-em-branco', 'revolucao-francesa', 'fotossintese'],
  locales: {
    'pt-BR': {
      slug: 'mapa-mental-para-resumo',
      title: 'Modelo de mapa mental para resumo',
      description:
        'Modelo de mapa mental para resumo, pronto para preencher online: tema central, ideias principais, detalhes, exemplos e dúvidas. Grátis e sem cadastro.',
      intro:
        'Um bom resumo não copia o texto: ele separa o que é central do que é detalhe. Este modelo de mapa mental dá essa estrutura pronta. No centro fica o tema, e em volta ficam cinco ramos que guiam a leitura: ideias principais, conceitos, exemplos, conexões e dúvidas. Serve para capítulo de livro, aula, videoaula ou artigo.',
      sections: [
        {
          heading: 'Como preencher',
          items: [
            'Tema central: escreva o assunto em poucas palavras, como "Fotossíntese" ou "Capítulo 3 — Era Vargas".',
            'Ideias principais: de três a cinco frases curtas que resumem o conteúdo. Se você só pudesse lembrar disso, já entenderia o assunto.',
            'Conceitos: os termos que a prova pode pedir, cada um com uma definição de uma linha.',
            'Exemplos: casos, datas, fórmulas ou situações que mostram a ideia funcionando.',
            'Conexões: com quais outros temas este se relaciona. Ajuda a responder questões que misturam matérias.',
            'Dúvidas: o que você não entendeu. Leve para a aula ou pesquise depois, e apague o ramo quando resolver.',
          ],
        },
        {
          heading: 'Por que resumir em mapa mental',
          paragraphs: [
            'No resumo em texto corrido tudo parece ter o mesmo peso. No mapa mental, a posição de cada ideia mostra a importância dela: o que está perto do centro é essencial, e o que está na ponta dos ramos é detalhe. Essa hierarquia visual facilita revisar na véspera da prova, porque você enxerga o assunto inteiro de uma vez.',
            'Escrever com as próprias palavras também é parte do estudo. Ao decidir o que entra em cada ramo, você precisa entender o conteúdo, e é isso que faz a matéria ficar na memória.',
          ],
        },
        {
          heading: 'Dicas',
          items: [
            'Use palavras-chave, não frases longas. Se precisar explicar mais, crie um ramo filho.',
            'Revise o mapa um dia depois e de novo uma semana depois, tentando lembrar cada ramo antes de abri-lo.',
            'Quando o mapa ficar grande, recolha os ramos que você já domina e foque no resto.',
          ],
        },
      ],
      source: `- Tema central
  - Ideias principais
    - Ideia 1
    - Ideia 2
    - Ideia 3
  - Conceitos
    - Termo: definição
  - Exemplos
    - Exemplo 1
  - Conexões
    - Tema relacionado
  - Dúvidas
    - O que não entendi
`,
      imageAlt: 'Modelo de mapa mental para resumo com os ramos ideias principais, conceitos, exemplos, conexões e dúvidas',
    },
    en: {
      slug: 'summary-mind-map',
      title: 'Summary mind map template',
      description:
        'A free summary mind map template to fill in online: main topic, key ideas, terms, examples, links and questions. No sign-up needed.',
      intro:
        'Summarizing is deciding what matters. This mind map template gives you the frame for that decision: the topic sits in the middle, surrounded by five branches that guide your reading, which are key ideas, terms, examples, links and open questions. Use it for a book chapter, a lecture, a video lesson or a research paper.',
      sections: [
        {
          heading: 'How to fill it in',
          items: [
            'Main topic: name the subject in a few words, such as "Photosynthesis" or "Chapter 4: The Cold War".',
            'Key ideas: three to five short statements that capture the material. If these were all you remembered, you would still understand the topic.',
            'Terms: vocabulary you will be tested on, each with a one-line definition.',
            'Examples: cases, dates, formulas or situations that show the idea in action.',
            'Links: other topics this one connects to, which helps with essay and cross-subject questions.',
            'Questions: anything you did not understand. Bring it to class or look it up, then delete the branch once it is answered.',
          ],
        },
        {
          heading: 'Why summarize with a mind map',
          paragraphs: [
            'In linear notes every sentence looks equally important. In a mind map, position carries meaning: what sits close to the center is essential, and what sits at the tips of the branches is detail. That makes last-minute review much faster, because the whole topic fits on one screen.',
            'Writing each branch in your own words is part of the learning. You cannot place an idea without understanding where it belongs, and that effort is what makes it stick.',
          ],
        },
        {
          heading: 'Tips',
          items: [
            'Use keywords rather than full sentences. If something needs more space, give it a child branch.',
            'Review the map the next day and again a week later, trying to recall each branch before you open it.',
            'As the map grows, collapse the branches you already know and focus on the rest.',
            'Before an exam, redraw the map from memory on paper and compare it with this one to find the gaps.',
          ],
        },
      ],
      source: `- Main topic
  - Key ideas
    - Idea 1
    - Idea 2
    - Idea 3
  - Terms
    - Term: definition
  - Examples
    - Example 1
  - Links
    - Related topic
  - Questions
    - What I did not understand
`,
      imageAlt: 'Summary mind map template with branches for key ideas, terms, examples, links and questions',
    },
  },
}
