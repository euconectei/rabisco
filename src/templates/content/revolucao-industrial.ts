import type { Template } from '../types'

export const revolucaoIndustrial: Template = {
  id: 'revolucao-industrial',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['revolucao-francesa', 'resumo'],
  locales: {
    'pt-BR': {
      slug: 'revolucao-industrial',
      title: 'Mapa mental da Revolução Industrial',
      description:
        'Mapa mental da Revolução Industrial: contexto, invenções, fases e consequências sociais. Abra, edite e estude grátis, sem cadastro.',
      intro:
        'A Revolução Industrial começou na Inglaterra na segunda metade do século XVIII e transformou a maneira como as pessoas produzem, trabalham e vivem. Em poucas décadas, a produção artesanal foi substituída por máquinas e fábricas, as cidades cresceram depressa e surgiu uma nova classe de trabalhadores assalariados. O tema é central no ensino médio e aparece com frequência no ENEM. Este mapa mental organiza o assunto em cinco ramos: contexto, inovações técnicas, fases, consequências sociais e legado.',
      sections: [
        {
          heading: 'Contexto',
          paragraphs: [
            'A Inglaterra reunia as condições que faltavam a outros países: capital acumulado no comércio colonial, mão de obra disponível depois dos cercamentos dos campos e reservas de carvão e ferro. A monarquia parlamentar garantia estabilidade política e protegia a propriedade privada, enquanto o mercado interno e as colônias consumiam o que as fábricas produziam. O resultado foi um ambiente favorável ao investimento em máquinas e na produção em larga escala.',
          ],
        },
        {
          heading: 'Inovações técnicas',
          paragraphs: [
            'A máquina a vapor aperfeiçoada por James Watt em 1769 passou a mover teares e bombas de água, liberando as fábricas da dependência de rios e moinhos. A indústria têxtil foi a primeira a se mecanizar, com a lançadeira volante e a spinning jenny aumentando muito a produtividade. Depois vieram a locomotiva a vapor, que ligou cidades e portos, e o uso do carvão mineral na metalurgia, barateando o ferro e o aço.',
          ],
        },
        {
          heading: 'Fases',
          items: [
            'A primeira fase (cerca de 1760–1860) ficou marcada pelo carvão, pelo ferro e pela indústria têxtil, com a Inglaterra no centro do processo.',
            'A segunda fase (cerca de 1860–1914) trouxe aço, eletricidade, petróleo e indústria química, além da linha de montagem e da produção em série.',
            'A industrialização se espalhou para a Bélgica, a França, a Alemanha, os Estados Unidos e o Japão, em ritmos e com características próprias.',
          ],
        },
        {
          heading: 'Consequências sociais',
          paragraphs: [
            'Milhares de camponeses deixaram o campo em busca de trabalho nas fábricas, e as cidades cresceram sem planejamento, com bairros operários insalubres. Nas fábricas, as jornadas chegavam a 14 ou 16 horas, os salários eram baixos e o trabalho infantil era comum. Aos poucos, os trabalhadores se organizaram em sindicatos e conquistaram leis fabris e o direito à greve. Ao mesmo tempo, formou-se a burguesia industrial, dona das fábricas e do capital, e o proletariado, que vivia da venda da sua força de trabalho.',
          ],
        },
        {
          heading: 'Legado',
          paragraphs: [
            'A Revolução Industrial separou definitivamente a produção artesanal da produção em massa e criou a sociedade urbana e industrial em que vivemos. Também alimentou debates que continuam atuais: desigualdade, condições de trabalho, poluição e o papel do Estado na economia. Pensadores como Karl Marx e Friedrich Engels analisaram essa transformação e deram origem ao socialismo científico.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Use o mapa como um teste, não como um resumo para reler. Escolha um ramo, feche os filhos e tente dizer em voz alta quais invenções ou consequências aparecem ali; só depois confira. Anote ao lado de cada fase uma data e um país para fixar a ordem dos acontecimentos.',
          ],
        },
      ],
      source: `- Revolução Industrial (século XVIII)
  - Contexto
    - Capital do comércio colonial
    - Mão de obra dos cercamentos
    - Carvão e ferro
    - Estabilidade política
  - Inovações técnicas
    - Máquina a vapor de Watt
    - Indústria têxtil mecanizada
    - Locomotiva e ferrovias
    - Ferro e aço
  - Fases
    - Primeira: carvão e têxtil
    - Segunda: aço e eletricidade
    - Difusão pela Europa e EUA
  - Consequências sociais
    - Êxodo rural e urbanização
    - Proletariado e burguesia industrial
    - Jornadas longas e trabalho infantil
    - Sindicatos e leis fabris
  - Legado
    - Produção em massa
    - Sociedade urbana e industrial
    - Debate sobre desigualdade
`,
      imageAlt:
        'Mapa mental da Revolução Industrial com os ramos contexto, inovações técnicas, fases, consequências sociais e legado',
    },
    en: {
      slug: 'industrial-revolution',
      title: 'Industrial Revolution mind map',
      description:
        'An Industrial Revolution mind map: background, inventions, phases and social change. Open it, edit it and study free, no account needed.',
      intro:
        'The Industrial Revolution started in Britain in the second half of the 1700s and reshaped how goods were made, where people lived and what work looked like. Within a few generations, hand tools gave way to machines, workshops gave way to factories, and millions moved from farms to fast-growing cities. This mind map splits the topic into five branches: background, key inventions, phases, social change and legacy.',
      sections: [
        {
          heading: 'Background',
          paragraphs: [
            'Britain had what other countries lacked: capital from colonial trade, a large workforce freed by the enclosure of common land, and rich deposits of coal and iron. A parliamentary monarchy protected property rights and kept politics stable, while domestic and colonial markets bought what the factories produced. Together, these conditions made it profitable to invest in machines and large-scale production.',
          ],
        },
        {
          heading: 'Key inventions',
          paragraphs: [
            "James Watt's improved steam engine of 1769 powered looms, pumps and, later, locomotives, freeing factories from their dependence on rivers. Textiles mechanized first, as the flying shuttle and the spinning jenny multiplied output per worker. Railways then linked factories to ports and markets, and coal-fired furnaces made iron and steel cheaper than ever before.",
          ],
        },
        {
          heading: 'Phases',
          items: [
            'The first phase (roughly 1760–1860) was built on coal, iron and textiles, with Britain at the center.',
            'The second phase (roughly 1860–1914) brought steel, electricity, oil, chemicals and the assembly line.',
            'Industrialization spread to Belgium, France, Germany, the United States and Japan, each at its own pace and with its own features.',
          ],
        },
        {
          heading: 'Social change',
          paragraphs: [
            'Rural workers moved to cities looking for factory jobs, and poor neighborhoods grew faster than housing, water and sanitation. Shifts often ran 14 to 16 hours, wages were low and child labor was widespread. Workers gradually organized into trade unions and won factory laws and the right to strike. A new industrial middle class owned the mills and capital, while the working class lived on wages.',
          ],
        },
        {
          heading: 'Legacy',
          paragraphs: [
            'Mass production replaced craft work for good and created the urban, industrial society we still live in. The period also raised questions that remain current: inequality, working conditions, pollution and the role of government in the economy. Thinkers such as Karl Marx and Friedrich Engels studied these changes and laid the groundwork for scientific socialism.',
          ],
        },
        {
          heading: 'How to study with this map',
          paragraphs: [
            'Treat the map as a quiz rather than a summary to reread. Pick a branch, hide its children and say out loud which inventions or consequences belong there; check only afterward. Write one date and one country next to each phase so the sequence sticks.',
          ],
        },
      ],
      source: `- Industrial Revolution (18th–19th century)
  - Background
    - Colonial trade capital
    - Enclosure workforce
    - Coal and iron
    - Stable politics
  - Key inventions
    - Watt steam engine
    - Mechanized textiles
    - Railways and locomotives
    - Iron and steel
  - Phases
    - First: coal and textiles
    - Second: steel and electricity
    - Spread to Europe and US
  - Social change
    - Rural exodus and cities
    - Working class and mill owners
    - Long shifts and child labor
    - Unions and factory laws
  - Legacy
    - Mass production
    - Urban industrial society
    - Inequality debates
`,
      imageAlt:
        'Industrial Revolution mind map with branches for background, key inventions, phases, social change and legacy',
    },
  },
}
