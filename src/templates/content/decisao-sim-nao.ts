import type { Template } from '../types'

export const decisaoSimNao: Template = {
  id: 'decisao-sim-nao',
  kind: 'structure',
  diagram: 'flowchart',
  category: 'work',
  related: ['fluxograma-de-processo', 'processo-de-compras'],
  locales: {
    'pt-BR': {
      slug: 'fluxograma-sim-nao',
      title: 'Modelo de fluxograma de decisão sim/não',
      description:
        'Modelo de fluxograma de decisão sim/não editável e grátis: início, pergunta, dois caminhos e fim. Abra no navegador, troque os textos e use sem cadastro.',
      intro:
        'O fluxograma de decisão sim/não é o mais simples de todos: uma pergunta com duas saídas. Mesmo assim, resolve muita coisa, de "o pedido tem estoque?" a "o aluno atingiu a média?". Este modelo traz a estrutura básica pronta para editar: início, uma pergunta em losango, um caminho para o sim, outro para o não, e o fim.',
      sections: [
        {
          heading: 'Os símbolos do modelo',
          items: [
            'Terminal (forma arredondada): marca o início e o fim do fluxo.',
            'Processo (retângulo): uma ação, como "Enviar pedido" ou "Avisar o cliente".',
            'Decisão (losango): uma pergunta que só pode ter resposta sim ou não.',
            'Setas: mostram a ordem. Da decisão sempre saem duas setas, uma rotulada "Sim" e outra "Não".',
          ],
        },
        {
          heading: 'Como adaptar',
          paragraphs: [
            'Troque o texto do losango pela sua pergunta. Ela deve ser fechada: "O valor passa de R$ 1.000?" funciona, "Qual é o valor?" não. Depois escreva, em cada caminho, a ação que acontece. Se a ação levar a outra pergunta, acrescente outro losango e continue o fluxo. É assim que se constrói uma árvore de decisão.',
            'Quando o caminho do "não" precisa voltar para uma etapa anterior, desenhe a seta de volta. Esse laço mostra repetições, como "corrigir e enviar de novo até ser aprovado".',
          ],
        },
        {
          heading: 'Onde usar',
          items: [
            'Regras de atendimento: quando escalar um chamado, quando dar reembolso.',
            'Processos internos: aprovação de compras, conferência de documentos.',
            'Estudo de lógica e programação: o losango é o "se" de um algoritmo.',
            'Decisões pessoais: listar o que fazer em cada resposta deixa a escolha mais clara.',
          ],
        },
        {
          heading: 'Dica',
          paragraphs: [
            'Mantenha uma pergunta por losango. Se a pergunta tem "e" ou "ou", quebre em duas decisões seguidas. O fluxo fica mais longo, mas qualquer pessoa consegue seguir sem dúvida.',
            'Antes de compartilhar, percorra o fluxo do início ao fim duas vezes, uma respondendo sempre sim e outra respondendo sempre não. Se algum caminho termina sem chegar ao fim, falta uma seta ou uma etapa.',
          ],
        },
      ],
      source: `flowchart TD
  A([Início]) --> B{A condição foi atendida?}
  B -- Sim --> C[Seguir com a ação]
  B -- Não --> D[Corrigir ou tratar a exceção]
  D --> B
  C --> E([Fim])
`,
      imageAlt: 'Modelo de fluxograma de decisão com início, uma pergunta em losango, caminhos sim e não e fim',
    },
    en: {
      slug: 'yes-no-flowchart',
      title: 'Yes/no decision flowchart template',
      description:
        'A free, editable yes/no decision flowchart template: start, a question, two paths and an end. Open it in your browser, change the labels and use it without an account.',
      intro:
        'A yes/no flowchart is the smallest useful diagram there is: one question, two ways out. It still covers a lot of ground, from "Is the item in stock?" to "Did the test pass?". This template gives you the basic shape, ready to edit: a start, a decision diamond, one path for yes, one for no, and an end.',
      sections: [
        {
          heading: 'The shapes in this template',
          items: [
            'Terminator (rounded shape): where the flow starts and ends.',
            'Process (rectangle): an action, such as "Ship the order" or "Email the customer".',
            'Decision (diamond): a question with only two answers, yes or no.',
            'Arrows: the order of steps. Two arrows always leave a decision, labeled "Yes" and "No".',
          ],
        },
        {
          heading: 'How to adapt it',
          paragraphs: [
            'Replace the text in the diamond with your own closed question. "Is the total over $500?" works and "What is the total?" does not. Then write the action that follows each answer. If an action leads to another question, add another diamond and keep going, and you have a decision tree.',
            'When the "no" path should return to an earlier step, draw the arrow back. That loop shows repetition, such as "fix and resubmit until approved".',
          ],
        },
        {
          heading: 'Where to use it',
          items: [
            'Support rules: when to escalate a ticket, when to issue a refund.',
            'Internal processes: purchase approvals, document checks.',
            'Learning logic and programming: the diamond is the "if" of an algorithm.',
            'Personal decisions: writing down what happens after each answer makes the choice clearer.',
          ],
        },
        {
          heading: 'Tip',
          paragraphs: [
            'Keep one question per diamond. If a question contains "and" or "or", split it into two decisions in a row. The chart gets longer, but anyone can follow it without guessing.',
            'Before you share it, walk through the chart twice: once answering yes at every diamond and once answering no. If a path stops before reaching the end, an arrow or a step is missing. A quick walk-through like this catches most gaps before a colleague finds them.',
          ],
        },
      ],
      source: `flowchart TD
  A([Start]) --> B{Is the condition met?}
  B -- Yes --> C[Carry on with the action]
  B -- No --> D[Fix it or handle the exception]
  D --> B
  C --> E([End])
`,
      imageAlt: 'Yes/no decision flowchart template with a start, a decision diamond, yes and no paths and an end',
    },
  },
}
