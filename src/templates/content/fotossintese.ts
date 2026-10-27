import type { Template } from '../types'

export const fotossintese: Template = {
  id: 'fotossintese',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['celula', 'resumo'],
  locales: {
    'pt-BR': {
      slug: 'fotossintese',
      title: 'Mapa mental da fotossíntese',
      description:
        'Mapa mental da fotossíntese com equação, fase clara, ciclo de Calvin e fatores limitantes. Abra, edite e estude grátis, sem cadastro.',
      intro:
        'A fotossíntese é o processo em que plantas, algas e cianobactérias usam a luz solar para transformar gás carbônico e água em glicose, liberando oxigênio. É a base de quase toda cadeia alimentar do planeta e um tema recorrente no ENEM e nos vestibulares. Este mapa mental organiza o assunto em cinco ramos: equação geral, cloroplasto, fase clara, ciclo de Calvin e fatores limitantes.',
      sections: [
        {
          heading: 'Equação geral',
          paragraphs: [
            'A equação simplificada é 6 CO2 + 6 H2O + energia luminosa → C6H12O6 + 6 O2. Na forma completa, com 12 moléculas de água nos reagentes, a reação também devolve 6 moléculas de água: 6 CO2 + 12 H2O → C6H12O6 + 6 O2 + 6 H2O.',
            'Nas plantas, tudo acontece nos cloroplastos. As membranas dos tilacoides abrigam a fase clara, e o estroma, o líquido interno, é o cenário do ciclo de Calvin. A clorofila, pigmento verde, absorve principalmente luz vermelha e azul e reflete o verde.',
          ],
        },
        {
          heading: 'Fase clara',
          items: [
            'Ocorre nas membranas dos tilacoides e depende diretamente da luz. A energia luminosa excita elétrons da clorofila, que percorrem uma cadeia transportadora e geram ATP.',
            'A água é quebrada pela fotólise, liberando elétrons, prótons e oxigênio. O O2 que respiramos vem justamente dessa etapa.',
            'O NADP+ recebe elétrons e prótons e se transforma em NADPH. ATP e NADPH seguem para o estroma e serão usados na fase seguinte.',
          ],
        },
        {
          heading: 'Fase escura (ciclo de Calvin)',
          paragraphs: [
            'Acontece no estroma e não precisa de luz direta, mas consome o ATP e o NADPH produzidos na fase clara. A enzima RuBisCO fixa o CO2 a uma molécula de cinco carbonos, a ribulose-1,5-bifosfato.',
            'O ciclo gera trioses que formam glicose e outros açúcares. Para cada molécula de glicose são necessárias seis voltas do ciclo, com gasto de 18 ATP e 12 NADPH. Melvin Calvin mapeou essas reações e recebeu o Nobel de Química em 1961.',
          ],
        },
        {
          heading: 'Fatores limitantes',
          paragraphs: [
            'A intensidade luminosa, a concentração de CO2 e a temperatura limitam a taxa de fotossíntese. Aumentar um fator acelera o processo apenas até outro se tornar limitante, ideia associada a Frederick Blackman.',
            'Temperatura alta demais desnatura enzimas, e a falta de água fecha os estômatos, reduzindo a entrada de CO2. O ponto de compensação luminoso é a intensidade de luz em que a fotossíntese iguala a respiração da planta.',
          ],
        },
        {
          heading: 'Pigmentos e importância',
          paragraphs: [
            'Além da clorofila a e b, os carotenoides captam outras faixas de luz e protegem a planta contra o excesso de energia. Cianobactérias fazem fotossíntese sem cloroplastos, em membranas internas.',
            'A fotossíntese mantém o oxigênio da atmosfera e produz a matéria orgânica que sustenta as cadeias alimentares.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Reescreva a equação de memória antes de abrir o mapa. Depois explique em voz alta o caminho do elétron na fase clara e só então confira os detalhes. Fechar os ramos e recitar o conteúdo rende mais do que apenas reler o resumo.',
          ],
        },
      ],
      source: `- Fotossíntese
  - Equação geral
    - Gás carbônico, água e luz
    - Glicose e oxigênio
  - Cloroplasto
    - Tilacoides
    - Estroma
    - Clorofila
  - Fase clara
    - Fotólise da água
    - ATP e NADPH
    - Libera oxigênio
  - Ciclo de Calvin
    - Fixação do CO2
    - Enzima RuBisCO
    - Forma glicose
  - Fatores limitantes
    - Intensidade luminosa
    - Concentração de CO2
    - Temperatura
    - Água
`,
      imageAlt:
        'Mapa mental da fotossíntese com equação, cloroplasto, fase clara, ciclo de Calvin e fatores limitantes',
    },
    en: {
      slug: 'photosynthesis',
      title: 'Photosynthesis mind map',
      description:
        'Photosynthesis mind map covering the equation, light reactions, the Calvin cycle and limiting factors. Open, edit and study it free, no account needed.',
      intro:
        'Photosynthesis is how plants, algae and cyanobacteria turn sunlight, carbon dioxide and water into sugar, releasing oxygen as a by-product. It feeds almost every food chain on Earth and comes up constantly in biology exams. This mind map covers the equation, the chloroplast, the light-dependent reactions, the Calvin cycle and the factors that limit the rate.',
      sections: [
        {
          heading: 'Overall equation',
          paragraphs: [
            'The simplified equation is 6 CO2 + 6 H2O + light energy → C6H12O6 + 6 O2. Written in full, with 12 water molecules on the left, the reaction also produces 6 water molecules: 6 CO2 + 12 H2O → C6H12O6 + 6 O2 + 6 H2O.',
            'In plants the work happens inside chloroplasts. The thylakoid membranes host the light-dependent reactions, and the stroma, the fluid around them, is where the Calvin cycle runs. Chlorophyll absorbs mostly red and blue light and reflects green.',
          ],
        },
        {
          heading: 'Light-dependent reactions',
          items: [
            'They take place in the thylakoid membranes and need light directly. Absorbed photons excite electrons in chlorophyll, and as those electrons travel down an electron transport chain they drive ATP production.',
            'Water is split by photolysis, releasing electrons, protons and oxygen. The oxygen we breathe comes from this step.',
            'NADP+ picks up electrons and protons to become NADPH. ATP and NADPH then move into the stroma for the next stage.',
          ],
        },
        {
          heading: 'The Calvin cycle',
          paragraphs: [
            'Also called the light-independent reactions, it runs in the stroma. It does not use light directly but depends on the ATP and NADPH made earlier. The enzyme RuBisCO fixes CO2 onto a five-carbon sugar, ribulose-1,5-bisphosphate.',
            'The cycle produces G3P, which becomes glucose and other sugars. One glucose takes six turns of the cycle and consumes 18 ATP and 12 NADPH. Melvin Calvin mapped the cycle and won the 1961 Nobel Prize in Chemistry for it.',
          ],
        },
        {
          heading: 'Limiting factors',
          paragraphs: [
            'Light intensity, CO2 concentration and temperature all cap the rate of photosynthesis. Raising one factor speeds things up only until another becomes limiting, an idea linked to Frederick Blackman.',
            'Very high temperatures denature enzymes, and drought closes stomata, cutting CO2 intake. The light compensation point is the light intensity at which photosynthesis exactly balances the respiration of the plant.',
          ],
        },
        {
          heading: 'Pigments and why it matters',
          paragraphs: [
            'Besides chlorophyll a and b, carotenoids capture other wavelengths and protect the plant from excess light. Cyanobacteria photosynthesize without chloroplasts, using internal membranes.',
            'Photosynthesis keeps atmospheric oxygen in supply and builds the organic matter that feeds consumers.',
          ],
        },
        {
          heading: 'How to study with this map',
          paragraphs: [
            'Write the equation from memory first, then talk through the electron path in the light reactions before checking the map. Collapsing branches and reciting what they hold beats rereading, because recall strengthens memory more than recognition does.',
          ],
        },
      ],
      source: `- Photosynthesis
  - Overall equation
    - CO2, water and light
    - Glucose and oxygen
  - Chloroplast
    - Thylakoids
    - Stroma
    - Chlorophyll
  - Light reactions
    - Water splitting
    - ATP and NADPH
    - Oxygen released
  - Calvin cycle
    - Carbon fixation
    - RuBisCO
    - Makes glucose
  - Limiting factors
    - Light intensity
    - CO2 concentration
    - Temperature
`,
      imageAlt:
        'Photosynthesis mind map with branches for the equation, chloroplast, light reactions, Calvin cycle and limiting factors',
    },
  },
}
