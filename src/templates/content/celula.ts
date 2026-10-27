import type { Template } from '../types'

export const celula: Template = {
  id: 'celula',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['fotossintese', 'sistema-nervoso'],
  locales: {
    'pt-BR': {
      slug: 'celula',
      title: 'Mapa mental da célula',
      description:
        'Mapa mental da célula para o ensino médio: procarionte x eucarionte, organelas e funções, célula animal x vegetal. Abra, edite e estude grátis.',
      intro:
        'A célula é a menor unidade capaz de realizar metabolismo e se reproduzir. No ensino médio, o estudo da citologia passa por três comparações: procariontes e eucariontes, a função de cada organela e as diferenças entre a célula animal e a vegetal. Este mapa mental reúne esses pontos em ramos curtos, com definições e exemplos que aparecem com frequência em provas e no ENEM.',
      sections: [
        {
          heading: 'Procariontes e eucariontes',
          paragraphs: [
            'Procariontes, como bactérias e arqueias, não têm núcleo delimitado por membrana. O DNA fica em uma região chamada nucleoide, e o citoplasma contém ribossomos, mas não organelas membranosas. A reprodução é assexuada, por divisão binária, e a célula costuma ser bem menor que a eucarionte.',
            'Eucariontes têm núcleo com envelope nuclear, onde o DNA fica associado a proteínas. O citoplasma é rico em organelas membranosas, o que permite dividir funções em compartimentos. Fungos, protozoários, plantas e animais são eucariontes. A teoria endossimbiótica explica mitocôndrias e cloroplastos como descendentes de bactérias incorporadas por uma célula ancestral, hipótese sustentada pelo DNA circular e pelos ribossomos dessas organelas.',
          ],
        },
        {
          heading: 'Organelas e funções',
          items: [
            'Núcleo: guarda o material genético e coordena a atividade da célula.',
            'Nucléolo: produz os componentes dos ribossomos.',
            'Membrana plasmática: controla a troca de substâncias com o meio.',
            'Mitocôndria: realiza a respiração celular e gera ATP.',
            'Ribossomo: monta proteínas a partir do RNA mensageiro.',
            'Retículo endoplasmático rugoso: sintetiza proteínas para secreção ou membrana.',
            'Retículo endoplasmático liso: produz lipídios e ajuda na desintoxicação.',
            'Complexo de Golgi: modifica, empacota e envia proteínas e lipídios.',
            'Lisossomo: digere materiais captados e recicla componentes celulares.',
            'Peroxissomo: degrada peróxido de hidrogênio e ácidos graxos.',
            'Cloroplasto: realiza a fotossíntese em células vegetais e algas.',
            'Citoesqueleto: sustenta a célula e participa do movimento.',
          ],
        },
        {
          heading: 'Célula animal e célula vegetal',
          paragraphs: [
            'A célula animal não tem parede celular nem cloroplastos. Possui centríolos, lisossomos e vacúolos pequenos e temporários. A forma é mantida pelo citoesqueleto, e o armazenamento de substâncias ocorre em vesículas.',
            'A célula vegetal tem parede de celulose, cloroplastos e um vacúolo central grande, que regula a pressão osmótica e armazena água, sais e pigmentos. As duas células compartilham núcleo, mitocôndrias, ribossomos, retículo e complexo de Golgi. Na divisão, a célula vegetal forma uma placa celular entre as células-filhas, e os plasmodesmos ligam células vizinhas, permitindo a passagem de água e de pequenas moléculas.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Feche o mapa, desenhe os ramos de memória e só depois compare com o original para completar as lacunas. Ligue cada organela a uma função em uma frase curta e explique o esquema em voz alta para alguém: ensinar obriga a organizar o raciocínio. Revise por cinco minutos no dia seguinte e novamente uma semana depois; o intervalo entre revisões ajuda a fixar o conteúdo.',
          ],
        },
      ],
      source: `- Célula
  - Procariontes x eucariontes
    - Sem núcleo definido
    - Com núcleo definido
    - Bactérias e arqueias
    - Teoria endossimbiótica
  - Organelas e funções
    - Núcleo e nucléolo
    - Mitocôndrias e ribossomos
    - Retículo e complexo de Golgi
    - Lisossomos e peroxissomos
  - Célula animal
    - Sem parede celular
    - Lisossomos e centríolos
    - Vacúolos pequenos
  - Célula vegetal
    - Parede de celulose
    - Cloroplastos
    - Vacúolo central grande
    - Plasmodesmos
  - Como estudar
    - Desenhe de memória
    - Ligue estrutura e função
    - Explique em voz alta
`,
      imageAlt:
        'Mapa mental da célula com ramos para procariontes e eucariontes, organelas, célula animal, célula vegetal e como estudar',
    },
    en: {
      slug: 'cell',
      title: 'Cell mind map',
      description:
        'Cell mind map for high school biology: prokaryotic vs eukaryotic cells, organelles and functions, animal vs plant cells. Open, edit and study for free.',
      intro:
        'A cell is the smallest unit that can carry out metabolism and reproduce. High school biology builds on three comparisons: prokaryotic versus eukaryotic cells, what each organelle does, and how animal and plant cells differ. This mind map keeps those ideas in short branches, with the definitions and examples that appear most often on tests.',
      sections: [
        {
          heading: 'Prokaryotes and eukaryotes',
          paragraphs: [
            'Prokaryotes, which include bacteria and archaea, have no nucleus surrounded by a membrane. Their DNA sits in a region called the nucleoid, and the cytoplasm contains ribosomes but no membrane-bound organelles. They reproduce asexually by binary fission and are usually much smaller than eukaryotic cells.',
            'Eukaryotes have a nucleus enclosed by a nuclear envelope, with DNA packaged with proteins. Their cytoplasm is full of membrane-bound organelles, which lets the cell separate reactions into compartments. Fungi, protists, plants and animals are eukaryotes. The endosymbiotic theory explains mitochondria and chloroplasts as descendants of bacteria taken in by an ancestral cell, an idea supported by their circular DNA and bacteria-like ribosomes.',
          ],
        },
        {
          heading: 'Organelles and functions',
          items: [
            'Nucleus: stores genetic material and coordinates cell activity.',
            'Nucleolus: makes the parts of ribosomes.',
            'Cell membrane: controls the exchange of substances with the environment.',
            'Mitochondrion: carries out cellular respiration and produces ATP.',
            'Ribosome: builds proteins from messenger RNA.',
            'Rough endoplasmic reticulum: makes proteins for secretion or membranes.',
            'Smooth endoplasmic reticulum: makes lipids and helps detoxify substances.',
            'Golgi apparatus: modifies, packages and ships proteins and lipids.',
            'Lysosome: digests material and recycles cell components.',
            'Peroxisome: breaks down hydrogen peroxide and fatty acids.',
            'Chloroplast: performs photosynthesis in plant cells and algae.',
            'Cytoskeleton: supports the cell and takes part in movement.',
          ],
        },
        {
          heading: 'Animal and plant cells',
          paragraphs: [
            'Animal cells have no cell wall and no chloroplasts. They contain centrioles, lysosomes and small temporary vacuoles. The cytoskeleton maintains their shape, while vesicles store and move substances.',
            'Plant cells have a cellulose wall, chloroplasts and a large central vacuole that maintains turgor and stores water, salts and pigments. Both cell types share a nucleus, mitochondria, ribosomes, endoplasmic reticulum and Golgi apparatus. Division and communication also differ: plant cells build a cell plate during division and connect to neighbors through plasmodesmata.',
          ],
        },
        {
          heading: 'How to study with this map',
          paragraphs: [
            'Close the map, redraw the branches from memory, then reopen it and fill only the gaps. Write one short sentence linking each organelle to its function and explain the diagram out loud to a classmate, because teaching forces you to organize the logic. Review for five minutes the next day and again a week later; spacing the reviews helps the material stick.',
          ],
        },
      ],
      source: `- Cell
  - Prokaryotes vs eukaryotes
    - No nucleus
    - Membrane-bound organelles
    - Bacteria and archaea
    - Endosymbiotic theory
  - Organelles
    - Nucleus and nucleolus
    - Mitochondria
    - Ribosomes
    - ER and Golgi
  - Animal cell
    - No cell wall
    - Lysosomes
    - Centrioles
  - Plant cell
    - Cellulose wall
    - Chloroplasts
    - Large central vacuole
  - Study routine
    - Draw from memory
    - Link structure to function
    - Explain aloud
`,
      imageAlt:
        'Cell mind map with branches for prokaryotes and eukaryotes, organelles, animal cells, plant cells and study tips',
    },
  },
}
