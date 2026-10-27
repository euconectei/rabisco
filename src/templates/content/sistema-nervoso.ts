import type { Template } from '../types'

export const sistemaNervoso: Template = {
  id: 'sistema-nervoso',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['celula', 'resumo'],
  locales: {
    'pt-BR': {
      slug: 'sistema-nervoso',
      title: 'Mapa mental do sistema nervoso',
      description:
        'Mapa mental do sistema nervoso: divisões central e periférica, neurônios, sinapses e reflexos. Abra, edite e estude grátis, sem cadastro.',
      intro:
        'O sistema nervoso coordena tudo o que o corpo faz: capta estímulos do ambiente, processa informações e comanda respostas rápidas, como o movimento e os reflexos. Também regula funções que não percebemos, como a respiração e os batimentos cardíacos. No ensino médio, o tema aparece ligado à citologia dos neurônios e à fisiologia humana. Este mapa mental divide o assunto em cinco ramos: organização, neurônios, sistema nervoso central, sistema nervoso periférico e funções vitais.',
      sections: [
        {
          heading: 'Organização geral',
          paragraphs: [
            'O sistema nervoso é dividido em central e periférico. O sistema nervoso central (SNC) é formado pelo encéfalo e pela medula espinal, protegidos pelas meninges, pelo líquido cerebrospinal e pelos ossos do crânio e da coluna. É nele que ocorre o processamento das informações.',
            'O sistema nervoso periférico (SNP) reúne os nervos e gânglios que ligam o SNC ao resto do corpo. Os nervos cranianos saem do encéfalo e os espinais saem da medula, levando informações sensoriais para o centro e comandos motores para fora.',
          ],
        },
        {
          heading: 'Neurônios e impulso nervoso',
          paragraphs: [
            'O neurônio é a célula do sistema nervoso. Ele tem corpo celular, dendritos, que recebem os sinais, e axônio, que conduz o impulso. Muitos axônios são envolvidos pela bainha de mielina, que acelera a transmissão.',
            'O impulso nervoso é elétrico dentro do neurônio e químico na passagem para a próxima célula. Essa passagem acontece nas sinapses, por meio de neurotransmissores. As células da glia dão suporte, nutrem e protegem os neurônios.',
          ],
        },
        {
          heading: 'Sistema nervoso central',
          paragraphs: [
            'O encéfalo inclui cérebro, cerebelo e tronco encefálico. O cérebro responde pelo pensamento, pela memória, pelas emoções e pelos movimentos voluntários. O cerebelo ajusta o equilíbrio e a coordenação motora. O tronco encefálico controla funções vitais, como a respiração e os batimentos cardíacos.',
            'A medula espinal conduz impulsos entre o corpo e o encéfalo e é sede de reflexos rápidos, as ações involuntárias que acontecem antes de o cérebro tomar consciência do estímulo.',
          ],
        },
        {
          heading: 'Sistema nervoso periférico',
          items: [
            'Somático: leva comandos voluntários aos músculos esqueléticos e traz informações dos sentidos.',
            'Autônomo: controla órgãos internos de forma involuntária e se divide em simpático e parassimpático.',
            'Simpático: prepara o corpo para situações de esforço ou perigo, acelerando o coração e liberando adrenalina.',
            'Parassimpático: favorece o repouso e a digestão, reduzindo os batimentos e estimulando o trabalho do estômago e do intestino.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Não tente decorar os nomes soltos: associe cada estrutura à função dela. Feche os ramos do mapa e explique em voz alta o caminho de um estímulo, do receptor até a resposta. Depois abra e confira o que faltou. Desenhar o esquema de memória, sem olhar, revela rápido onde está a lacuna.',
          ],
        },
      ],
      source: `- Sistema nervoso
  - Organização
    - Sistema nervoso central
    - Sistema nervoso periférico
    - Meninges e proteção óssea
  - Neurônios
    - Corpo celular e dendritos
    - Axônio e bainha de mielina
    - Sinapses e neurotransmissores
    - Células da glia
  - Sistema nervoso central
    - Cérebro
    - Cerebelo
    - Tronco encefálico
    - Medula espinal
  - Sistema nervoso periférico
    - Somático
    - Autônomo
      - Simpático
      - Parassimpático
  - Funções vitais
    - Respiração e batimentos
    - Reflexos
`,
      imageAlt:
        'Mapa mental do sistema nervoso com os ramos organização, neurônios, sistema nervoso central, sistema nervoso periférico e funções vitais',
    },
    en: {
      slug: 'nervous-system',
      title: 'Nervous system mind map',
      description:
        'Nervous system mind map: central and peripheral divisions, neurons, synapses and reflexes. Open it, edit it and study for free, no sign-up.',
      intro:
        'The nervous system is the control network of the body: it picks up stimuli, processes information and triggers fast responses such as movement and reflexes. It also runs functions you never think about, like breathing and heart rate. For high school biology, the key is linking neuron structure to how signals travel and how the central and peripheral divisions share the work. This mind map groups the topic into five branches: organization, neurons, central nervous system, peripheral nervous system and vital functions.',
      sections: [
        {
          heading: 'Organization',
          paragraphs: [
            'The nervous system has two main divisions. The central nervous system (CNS) consists of the brain and spinal cord, protected by the meninges, cerebrospinal fluid and the bones of the skull and spine. This is where information is integrated and decisions are made.',
            'The peripheral nervous system (PNS) includes the nerves and ganglia that connect the CNS to the rest of the body. Cranial nerves leave the brain and spinal nerves leave the spinal cord, carrying sensory input inward and motor commands outward.',
          ],
        },
        {
          heading: 'Neurons and nerve impulses',
          paragraphs: [
            'The neuron is the signaling cell of the nervous system. It has a cell body, dendrites that receive messages and an axon that carries the impulse away. Many axons are wrapped in myelin, a fatty sheath that speeds up transmission.',
            'Within a neuron the signal is electrical; between neurons it is chemical. At a synapse, neurotransmitters cross the gap and trigger the next cell. Glial cells support, feed and protect neurons, and help repair damage.',
          ],
        },
        {
          heading: 'Central nervous system',
          paragraphs: [
            'The brain includes the cerebrum, cerebellum and brainstem. The cerebrum handles thought, memory, emotion and voluntary movement. The cerebellum fine-tunes balance and coordination. The brainstem controls vital functions such as breathing and heartbeat.',
            'The spinal cord carries signals between the body and the brain and is the center for quick reflexes, responses that happen before the brain consciously registers the stimulus.',
          ],
        },
        {
          heading: 'Peripheral nervous system',
          items: [
            'Somatic: carries voluntary commands to skeletal muscles and sensory information from the body.',
            'Autonomic: controls internal organs without conscious effort and splits into sympathetic and parasympathetic.',
            'Sympathetic: prepares the body for stress or danger, raising heart rate and releasing adrenaline.',
            'Parasympathetic: supports rest and digestion, slowing the heart and stimulating the stomach and intestines.',
          ],
        },
        {
          heading: 'How to study with this map',
          paragraphs: [
            'Do not memorize names on their own; attach each structure to a job. Collapse the branches and trace one signal out loud, from receptor to response. Then expand the map and check what you missed. Redrawing the diagram from memory, without looking, shows you quickly which link is missing.',
          ],
        },
      ],
      source: `- Nervous system
  - Organization
    - Central nervous system
    - Peripheral nervous system
    - Meninges and bone protection
  - Neurons
    - Cell body and dendrites
    - Axon and myelin sheath
    - Synapses and neurotransmitters
    - Glial cells
  - Central nervous system
    - Cerebrum
    - Cerebellum
    - Brainstem
    - Spinal cord
  - Peripheral nervous system
    - Somatic division
    - Autonomic division
      - Sympathetic
      - Parasympathetic
  - Vital functions
    - Breathing and heartbeat
    - Reflexes
`,
      imageAlt:
        'Nervous system mind map with branches for organization, neurons, central nervous system, peripheral nervous system and vital functions',
    },
  },
}
