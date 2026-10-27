import type { Template } from '../types'

export const mapaEmBranco: Template = {
  id: 'mapa-em-branco',
  kind: 'structure',
  diagram: 'mindmap',
  category: 'study',
  related: ['resumo', 'revolucao-francesa'],
  locales: {
    'pt-BR': {
      slug: 'mapa-mental-em-branco',
      title: 'Modelo de mapa mental em branco',
      description:
        'Modelo de mapa mental em branco para preencher: tema central, quatro ramos e sub-ramos editáveis. Monte seu mapa do zero, grátis e sem cadastro.',
      intro:
        'Um mapa mental em branco serve para organizar um assunto antes de estudar, sem a estrutura pronta de um resumo. Em vez de ler uma lista feita por outra pessoa, você decide o que entra em cada ramo e como as ideias se conectam. Este modelo traz apenas o esqueleto: um tema central, quatro ramos e dois sub-ramos por ramo. A partir daí, é só trocar os rótulos genéricos pelo conteúdo da matéria e acrescentar o que faltar.',
      sections: [
        {
          heading: 'O que entra no tema central',
          paragraphs: [
            'O tema central é o assunto principal, escrito em poucas palavras. Use um substantivo ou uma expressão curta, como Revolução Industrial, fotossíntese ou figuras de linguagem. Evite uma pergunta longa ou uma frase inteira: o mapa precisa ser lido de relance. Se o assunto for muito amplo, divida em dois mapas. Por exemplo, um mapa para a célula e outro para as organelas.',
          ],
        },
        {
          heading: 'Como abrir os ramos principais',
          paragraphs: [
            'Os quatro ramos representam as grandes divisões do tema. No modelo, eles aparecem como Ramo 1, Ramo 2, Ramo 3 e Ramo 4, mas devem ser renomeados. Uma boa divisão usa critérios claros: causas, características, etapas e consequências; ou definição, tipos, exemplos e aplicações. Os ramos devem ficar no mesmo nível e usar palavras-chave, não frases completas.',
            'Se você não sabe por onde começar, volte ao índice do livro ou às seções da apostila. Cada título importante costuma virar um ramo. Depois, elimine o que for repetido e junte os assuntos que pertencem ao mesmo grupo.',
          ],
        },
        {
          heading: 'Sub-ramos e conexões',
          paragraphs: [
            'Os sub-ramos detalham cada ramo com fatos, datas, fórmulas ou exemplos. Limite a dois ou três por ramo no começo: se colocar tudo, o mapa vira uma lista disfarçada. Depois, ligue ideias que aparecem em ramos diferentes com setas ou cores iguais. Essa ligação mostra relações que um resumo linear esconde, como a influência de uma causa sobre uma consequência.',
          ],
        },
        {
          heading: 'Personalize o modelo',
          paragraphs: [
            'Use cores diferentes para cada ramo e uma imagem ou símbolo no tema central. O cérebro lembra melhor de informações associadas a pistas visuais. Mantenha os rótulos curtos, com até seis palavras, porque o mapa é para consulta rápida, não para texto corrido. Se precisar explicar um conceito, deixe a explicação para as suas anotações e mantenha só a pista no mapa.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Preencha o mapa sem consultar o material e só depois confira o que faltou. Esse esforço de lembrar vale mais do que copiar o caderno. Em seguida, cubra um ramo e tente reconstruí-lo em voz alta. Repita em dias diferentes, porque a revisão espaçada fixa o conteúdo. No fim, transforme cada sub-ramo em uma pergunta e teste você mesmo.',
          ],
        },
      ],
      source: `- Tema central
  - Ramo 1
    - Sub-ramo 1
    - Sub-ramo 2
  - Ramo 2
    - Sub-ramo 1
    - Sub-ramo 2
  - Ramo 3
    - Sub-ramo 1
    - Sub-ramo 2
  - Ramo 4
    - Sub-ramo 1
    - Sub-ramo 2
`,
      imageAlt: 'Modelo de mapa mental em branco com um tema central, quatro ramos e dois sub-ramos em cada ramo',
    },
    en: {
      slug: 'blank-mind-map',
      title: 'Blank mind map template',
      description:
        'Blank mind map template with a central topic, four branches and editable sub-branches. Build your own mind map from scratch, free and without an account.',
      intro:
        'A blank mind map gives you the frame of a study map without deciding the content for you. Instead of reading a finished summary, you choose the main branches, name them and add the details that matter. This template keeps only the skeleton: one central topic, four branches and two sub-branches under each one. Replace the generic labels with your subject and the map becomes yours.',
      sections: [
        {
          heading: 'Start with one central topic',
          paragraphs: [
            'Write the subject in the middle using a short noun phrase, such as the Industrial Revolution, photosynthesis or English verb tenses. Keep it specific enough to guide the branches, but not so narrow that you run out of material. If the topic covers two different subjects, make two maps rather than forcing everything into one. A clear center makes the rest of the map easier to read.',
          ],
        },
        {
          heading: 'Name the four main branches',
          paragraphs: [
            'The four branches are the big sections of your topic. The template labels them Branch 1 to Branch 4; rename each one with a category that fits. Useful patterns are causes, features, stages and effects, or definition, types, examples and uses. Keep all four at the same level and write keywords rather than full sentences. If a branch sounds like a paragraph, it is too broad or too detailed.',
            'When you are unsure where to start, look at the chapter headings in your textbook or class notes. Each major heading often becomes a branch. Then remove repeated ideas and group the ones that belong together.',
          ],
        },
        {
          heading: 'Fill in the sub-branches',
          paragraphs: [
            'Each branch has two sub-branches for facts, dates, formulas or examples. Start with two and add more only when they help you understand the subject. Too many details turn the map into a list with lines. Use arrows or matching colors to connect ideas that sit in different branches. Those cross-links often make a topic click, because they show how one fact affects another.',
          ],
        },
        {
          heading: 'Make it visual',
          paragraphs: [
            'Give each branch its own color and put a simple image or symbol at the center. Visual cues make recall easier, especially when you review several subjects in the same week. Keep labels under about six words and leave the long explanations for your notes. A mind map should work like a set of signs: quick to scan, easy to remember and clear enough to guide you back to the details.',
          ],
        },
        {
          heading: 'How to study with this map',
          paragraphs: [
            'Fill the template from memory first, then open your notes and correct the gaps. The act of retrieving what you know is more useful than copying a page. Next, hide one branch and rebuild it aloud, then do the same with another branch on a later day. Spacing the reviews helps the structure stay in your memory. Finally, turn each sub-branch into a question and answer it without looking.',
          ],
        },
      ],
      source: `- Central topic
  - Branch 1
    - Sub-branch 1
    - Sub-branch 2
  - Branch 2
    - Sub-branch 1
    - Sub-branch 2
  - Branch 3
    - Sub-branch 1
    - Sub-branch 2
  - Branch 4
    - Sub-branch 1
    - Sub-branch 2
`,
      imageAlt: 'Blank mind map template with one central topic, four branches and two sub-branches under each branch',
    },
  },
}
