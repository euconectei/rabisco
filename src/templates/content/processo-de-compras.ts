import type { Template } from '../types'

export const processoDeCompras: Template = {
  id: 'processo-de-compras',
  kind: 'filled',
  diagram: 'flowchart',
  category: 'work',
  related: ['fluxograma-de-processo', 'decisao-sim-nao'],
  locales: {
    'pt-BR': {
      slug: 'fluxograma-do-processo-de-compras',
      title: 'Fluxograma do processo de compras',
      description:
        'Fluxograma do processo de compras editável e grátis: requisição, aprovação, cotação, pedido, recebimento e pagamento. Abra no navegador e edite.',
      intro:
        'O processo de compras começa quando alguém identifica uma necessidade e termina quando o fornecedor recebe o pagamento. No meio, há aprovação, cotação, pedido e conferência da entrega. Este fluxograma mostra essa sequência em um só lugar, com as decisões que costumam travar o andamento: a requisição foi aprovada? O fornecedor escolhido atende? O material chegou conforme o pedido? Use o modelo para documentar o processo da sua empresa ou para treinar quem está entrando agora na área.',
      sections: [
        {
          heading: 'As etapas do fluxo',
          items: [
            'Requisição: quem precisa registra o item, a quantidade, a justificativa e a data em que precisa receber.',
            'Aprovação: o gestor confere se a compra cabe no orçamento e se não há estoque disponível.',
            'Cotação: em geral, pelo menos três fornecedores são consultados, com prazo de resposta e condições de pagamento.',
            'Pedido de compra: documento com especificação, preço, prazo de entrega e forma de pagamento.',
            'Recebimento e conferência: quantidade, estado dos itens e nota fiscal são comparados com o pedido.',
            'Pagamento: liberado depois que a nota fiscal e o recebimento batem com o pedido.',
          ],
        },
        {
          heading: 'As decisões do fluxo',
          paragraphs: [
            'A primeira decisão é a aprovação da requisição. Se ela volta sem aprovação, o solicitante ajusta o pedido e o fluxo recomeça. Vale registrar o motivo da recusa para evitar idas e voltas iguais.',
            'A escolha do fornecedor não é só preço. Prazo, qualidade, frete e histórico de entregas entram na comparação. Quando nenhuma proposta serve, a cotação é refeita.',
            'Na conferência, o material pode chegar incompleto, danificado ou fora da especificação. Nesse caso, o fluxo prevê devolução ou troca antes do pagamento, o que protege a empresa de pagar por algo que não recebeu.',
          ],
        },
        {
          heading: 'Controles que evitam problemas',
          items: [
            'Separe quem pede, quem aprova e quem paga: a mesma pessoa não deve fechar as três pontas.',
            'Guarde propostas, pedidos e notas fiscais no mesmo lugar, ligados pelo número do pedido.',
            'Defina prazos para cada etapa; compras urgentes precisam de um caminho alternativo, não de atalhos informais.',
            'Acompanhe atrasos de entrega e divergências de nota para cobrar o fornecedor com dados.',
          ],
        },
        {
          heading: 'Como usar em treinamentos',
          paragraphs: [
            'Cubra um bloco do diagrama e tente dizer o que vem antes e depois dele. Depois escolha um caminho de exceção, como uma entrega recusada, e percorra o fluxo em voz alta. Ao final, desenhe o processo de memória em uma folha; comparar o seu desenho com o modelo mostra quais etapas ainda não ficaram claras.',
          ],
        },
      ],
      source: `flowchart TD
  A([Início: necessidade identificada]) --> B[Requisição de compra]
  B --> C{Requisição aprovada?}
  C -- Não --> D[Devolver ao solicitante]
  D --> B
  C -- Sim --> E[Cotação com fornecedores]
  E --> F[Comparar propostas]
  F --> G{Fornecedor escolhido?}
  G -- Não --> E
  G -- Sim --> H[Pedido de compra]
  H --> I[Recebimento e conferência]
  I --> J{Material conforme?}
  J -- Não --> K[Devolver ou trocar]
  K --> I
  J -- Sim --> L[Pagamento]
  L --> M([Fim])
`,
      imageAlt:
        'Fluxograma do processo de compras, da requisição ao pagamento, com decisões de aprovação, escolha de fornecedor e conferência do material',
    },
    en: {
      slug: 'purchasing-process-flowchart',
      title: 'Purchasing process flowchart',
      description:
        'Editable purchasing process flowchart: requisition, approval, supplier quotes, purchase order, receiving and payment. Open it in your browser and edit.',
      intro:
        'A purchasing process runs from the moment someone spots a need to the moment the supplier gets paid. In between sit approval, quotes, a purchase order and a delivery check. This flowchart puts the whole sequence on one page and makes the sticking points visible: was the request approved, did the chosen supplier meet the terms, and did the goods arrive as ordered? Use it to document how your team buys, or to walk a new colleague through the steps.',
      sections: [
        {
          heading: 'The steps in order',
          items: [
            'Requisition: the person who needs something logs the item, quantity, reason and required date.',
            'Approval: a manager checks the budget and confirms the item is not already in stock.',
            'Supplier quotes: usually at least three suppliers are asked for price, lead time and payment terms.',
            'Purchase order: the document that fixes the specification, price, delivery date and payment terms.',
            'Receiving and inspection: quantity, condition and invoice are compared against the purchase order.',
            'Payment: released once the invoice and the receipt match what was ordered.',
          ],
        },
        {
          heading: 'The decision points',
          paragraphs: [
            'Approval is the first gate. A rejected requisition goes back to the requester, who adjusts it and resubmits. Recording why it was rejected saves everyone from repeating the same round trip.',
            'Picking a supplier is not just about the lowest price. Lead time, quality, shipping cost and past delivery record all count. If none of the quotes fit, the team runs the quote round again.',
            'At inspection, goods can arrive short, damaged or off-spec. The flow sends those back for return or replacement before payment, so the company never pays for something it cannot use.',
          ],
        },
        {
          heading: 'Controls worth having',
          items: [
            'Split the roles: the person who requests, the one who approves and the one who pays should not be the same.',
            'Keep quotes, orders and invoices together, linked by the purchase order number.',
            'Set a target time for each step. Urgent buys need a fast lane, not an informal shortcut.',
            'Track late deliveries and invoice mismatches so you can raise them with suppliers using facts.',
          ],
        },
        {
          heading: 'Using it for training',
          paragraphs: [
            'Hide one box at a time and say out loud what comes before and after it. Then pick an exception path, such as a rejected delivery, and trace it through. Finish by redrawing the flow from memory; the boxes you forget are the ones to review before the next run-through.',
          ],
        },
      ],
      source: `flowchart TD
  A([Start: need identified]) --> B[Purchase requisition]
  B --> C{Requisition approved?}
  C -- No --> D[Return to requester]
  D --> B
  C -- Yes --> E[Request supplier quotes]
  E --> F[Compare proposals]
  F --> G{Supplier selected?}
  G -- No --> E
  G -- Yes --> H[Issue purchase order]
  H --> I[Receive and inspect]
  I --> J{As ordered?}
  J -- No --> K[Return or replace]
  K --> I
  J -- Yes --> L[Pay supplier]
  L --> M([End])
`,
      imageAlt:
        'Purchasing process flowchart from requisition to payment, with decision points for approval, supplier choice and delivery inspection',
    },
  },
}
