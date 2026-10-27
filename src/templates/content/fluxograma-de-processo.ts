import type { Template } from '../types'

export const fluxogramaDeProcesso: Template = {
  id: 'fluxograma-de-processo',
  kind: 'structure',
  diagram: 'flowchart',
  category: 'work',
  related: ['decisao-sim-nao', 'processo-de-compras'],
  locales: {
    'pt-BR': {
      slug: 'modelo-de-fluxograma-de-processo',
      title: 'Modelo de fluxograma de processo',
      description:
        'Modelo de fluxograma de processo editável e grátis: início, etapas, decisão de verificação com retorno e fim. Monte seu fluxo no navegador, sem cadastro.',
      intro:
        'Um fluxograma de processo mostra, passo a passo, como uma tarefa sai do pedido e chega ao resultado. Este modelo traz a estrutura mínima que funciona em quase todo processo: um início, três ou quatro etapas em sequência, uma decisão de verificação e um fim. Se a verificação falhar, o fluxo volta para a etapa que precisa ser refeita e o ciclo se repete até o resultado ficar correto. Troque os textos de exemplo pelas ações do seu trabalho e o mapa já fica utilizável.',
      sections: [
        {
          heading: 'As etapas do modelo',
          items: [
            'Início: o gatilho do processo, como o recebimento de um pedido ou a abertura de um chamado.',
            'Etapas: as ações principais, uma por retângulo, sempre na ordem em que acontecem.',
            'Verificação: um losango que pergunta se o resultado atende ao esperado.',
            'Retorno: quando a resposta é não, a seta leva de volta à etapa que precisa ser corrigida.',
            'Fim: o resultado aprovado, que encerra o fluxo.',
          ],
        },
        {
          heading: 'O que cada símbolo significa',
          items: [
            'Elipse: marca o início e o fim; também aparece como retângulo arredondado.',
            'Retângulo: uma atividade feita por pessoa ou sistema.',
            'Losango: uma decisão com duas saídas, sim e não.',
            'Seta: indica a ordem; o texto ao lado mostra a condição da passagem.',
          ],
        },
        {
          heading: 'Como adaptar ao seu processo',
          paragraphs: [
            'Liste as ações na ordem real, usando verbos no infinitivo: receber, conferir, executar, registrar. Coloque a decisão depois da etapa que pode falhar, porque é ali que a conferência faz sentido. Cada caixa deve caber em uma linha e ter um responsável claro; se a etapa precisa de duas pessoas, provavelmente são duas etapas.',
            'O retorno deve apontar para uma etapa específica, não para o início. Voltar ao começo esconde onde está o erro e deixa o processo mais lento. Se o fluxo tiver muitos caminhos de volta, talvez a verificação esteja sendo feita tarde demais.',
          ],
        },
        {
          heading: 'Onde usar',
          items: [
            'Atendimento: triagem, escalonamento e encerramento de chamados.',
            'Compras: solicitação, aprovação, recebimento e conferência de notas.',
            'Produção: montagem, teste de qualidade e retrabalho.',
            'Rotinas administrativas: emissão, revisão e arquivo de documentos.',
          ],
        },
        {
          heading: 'Como estudar com este modelo',
          paragraphs: [
            'Use o fluxograma para revisar um processo visto em sala, como o ciclo da água, a fotossíntese ou uma cadeia produtiva. Feche o material, escreva as etapas de memória e marque onde entra a verificação. Explique em voz alta o que acontece em cada caminho e depois confira com o livro. As etapas que você esqueceu mostram exatamente o ponto da matéria que precisa de outra leitura.',
          ],
        },
      ],
      source: `flowchart TD
  A([Início]) --> B[Receber a solicitação]
  B --> C[Conferir os dados]
  C --> D[Executar a etapa principal]
  D --> E{Está correto?}
  E -- Sim --> F([Fim])
  E -- Não --> G[Corrigir o que falhou]
  G --> C
`,
      imageAlt:
        'Modelo de fluxograma de processo com início, três etapas, uma decisão de verificação com retorno e fim',
    },
    en: {
      slug: 'process-flowchart',
      title: 'Process flowchart template',
      description:
        'Free, editable process flowchart template: start, steps, a check decision with a loop back and an end. Build your flow in the browser, no sign-up.',
      intro:
        'A process flowchart shows, step by step, how work moves from a request to a result. This template gives you the smallest structure that holds up in most cases: a start, three or four steps in sequence, a check decision and an end. When the check fails, the flow loops back to the step that needs another pass, and the cycle repeats until the output is right. Teams use charts like this to document a routine before automating it or to train a new colleague. Swap the sample labels for your own actions and you already have a usable map.',
      sections: [
        {
          heading: 'The steps in this template',
          items: [
            'Start: the trigger, such as an order arriving or a ticket being opened.',
            'Steps: the main actions, one per rectangle, in the order they happen.',
            'Check: a diamond asking whether the result meets the standard.',
            'Loop back: if the answer is no, the arrow returns to the step that needs fixing.',
            'End: the approved result, which closes the flow.',
          ],
        },
        {
          heading: 'What each shape means',
          items: [
            'Oval: marks the start and the end; it may also appear as a rounded rectangle.',
            'Rectangle: an activity carried out by a person or a system.',
            'Diamond: a decision with two exits, yes and no.',
            'Arrow: shows the order; the label beside it gives the condition.',
          ],
        },
        {
          heading: 'How to adapt it',
          paragraphs: [
            'List the actions in the order they really happen, using verbs: receive, check, run, record. Put the decision after the step that can fail, because that is where checking makes sense. Keep each box to one line with a clear owner; if a step needs two people, it is probably two steps.',
            'The loop should point to a specific step, not to the start. Going back to the beginning hides where the error is and slows the process down. If your chart has many return arrows, the check may be happening too late.',
          ],
        },
        {
          heading: 'Where to use it',
          items: [
            'Support: triage, escalation and closing of tickets.',
            'Purchasing: request, approval, delivery and invoice checks.',
            'Manufacturing: assembly, quality testing and rework.',
            'Office routines: issuing, reviewing and filing documents.',
          ],
        },
        {
          heading: 'How to study with this template',
          paragraphs: [
            'Use the chart to review a process from class, such as the water cycle, photosynthesis or a supply chain. Close your notes, write the stages from memory and mark where the check belongs. Explain each path out loud, then compare with the textbook. The stages you forgot show exactly which part of the topic needs another read.',
          ],
        },
      ],
      source: `flowchart TD
  A([Start]) --> B[Receive the request]
  B --> C[Check the details]
  C --> D[Run the main step]
  D --> E{Is it correct?}
  E -- Yes --> F([End])
  E -- No --> G[Fix what failed]
  G --> C
`,
      imageAlt:
        'Process flowchart template with a start, three steps, a check decision that loops back and an end',
    },
  },
}
