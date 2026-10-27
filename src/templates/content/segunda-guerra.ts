import type { Template } from '../types'

export const segundaGuerra: Template = {
  id: 'segunda-guerra',
  kind: 'filled',
  diagram: 'mindmap',
  category: 'study',
  related: ['guerra-fria', 'era-vargas', 'resumo'],
  locales: {
    'pt-BR': {
      slug: 'segunda-guerra-mundial',
      title: 'Mapa mental da Segunda Guerra Mundial',
      description:
        'Mapa mental da Segunda Guerra Mundial (1939–1945): causas, fases, frentes, Holocausto e consequências. Estude e edite grátis, sem cadastro.',
      intro:
        'A Segunda Guerra Mundial (1939–1945) foi o conflito mais mortal da história, com dezenas de países envolvidos e dezenas de milhões de mortos. Começou com a invasão alemã da Polônia e terminou com a rendição da Alemanha e do Japão. Este mapa mental organiza o tema em cinco ramos: causas, fases, frentes, Holocausto e consequências.',
      sections: [
        {
          heading: 'Causas',
          paragraphs: [
            'O Tratado de Versalhes (1919), que encerrou a Primeira Guerra Mundial, impôs à Alemanha perdas territoriais, desarmamento e pesadas indenizações. A crise de 1929 agravou o desemprego e a instabilidade na Europa, enquanto regimes totalitários ganhavam força. O nazismo, liderado por Hitler, defendia a expansão territorial e a superioridade racial; o fascismo italiano e o militarismo japonês também buscavam ampliar seus impérios.',
            'A Liga das Nações não conseguiu conter essas ambições. A política de apaziguamento, que cedeu territórios a Hitler, só estimulou a ofensiva alemã. O pacto germano-soviético de 1939 dividiu o leste europeu e abriu caminho para a invasão da Polônia em 1º de setembro.',
          ],
        },
        {
          heading: 'Fases',
          items: [
            'Avanço do Eixo (1939–1941): a blitzkrieg alemã domina a Polônia, a Dinamarca, a Noruega, os Países Baixos e a França, que se rende em junho de 1940; a Itália entra na guerra ao lado da Alemanha.',
            'Guerra global (1941): a Operação Barbarossa invade a União Soviética em junho, e o ataque japonês a Pearl Harbor, em dezembro, leva os Estados Unidos ao conflito.',
            'Virada aliada (1942–1943): Stalingrado, El Alamein e Midway mudam o rumo da guerra; a Itália se rende em 1943.',
            'Ofensiva final (1944–1945): o Dia D abre a frente ocidental, a Alemanha se rende em maio de 1945 e o Japão em setembro, após as bombas atômicas.',
          ],
        },
        {
          heading: 'Frentes',
          paragraphs: [
            'Na Europa, houve combates terrestres e aéreos e a ocupação de países inteiros. No Pacífico, Estados Unidos e Japão disputaram ilhas e rotas marítimas, em batalhas como Midway e Iwo Jima. No norte da África, os Aliados enfrentaram o Eixo até expulsá-lo em 1943. O Brasil participou com a Força Expedicionária Brasileira (FEB), que lutou na Itália em 1944–1945.',
          ],
        },
        {
          heading: 'Holocausto',
          paragraphs: [
            'O regime nazista perseguiu e assassinou cerca de seis milhões de judeus, além de ciganos, pessoas com deficiência, homossexuais, prisioneiros políticos e outros grupos. O genocídio foi organizado em guetos e campos de concentração e extermínio, como Auschwitz-Birkenau. Depois da guerra, líderes nazistas foram julgados por esses crimes no Tribunal de Nuremberg.',
          ],
        },
        {
          heading: 'Consequências',
          paragraphs: [
            'A guerra deixou entre 60 e 70 milhões de mortos e destruiu cidades e economias. A Europa perdeu centralidade política, e Estados Unidos e União Soviética emergiram como superpotências, dando início à Guerra Fria. A Organização das Nações Unidas (ONU) foi criada em 1945 para tentar preservar a paz. A Alemanha foi dividida, o Plano Marshall ajudou a reconstruir a Europa e o enfraquecimento dos impérios coloniais acelerou a descolonização da Ásia e da África.',
          ],
        },
        {
          heading: 'Como estudar com este mapa',
          paragraphs: [
            'Combine o mapa com uma linha do tempo: em cada ramo, anote a data que liga um fato ao seguinte. Depois cubra os nós e explique em voz alta a relação entre causa e consequência, de Versalhes à Guerra Fria. Na revisão, embaralhe os ramos e reconstrua o mapa sem olhar; assim você testa o encadeamento, não só a imagem.',
          ],
        },
      ],
      source: `- Segunda Guerra Mundial (1939–1945)
  - Causas
    - Tratado de Versalhes
    - Crise de 1929
    - Regimes totalitários
    - Fracasso do apaziguamento
  - Fases
    - Avanço do Eixo (1939–1941)
    - Virada aliada (1942–1943)
    - Ofensiva final (1944–1945)
  - Frentes
    - Europa e África
    - Pacífico
    - Força Expedicionária Brasileira
  - Holocausto
    - Perseguição aos judeus
    - Campos de extermínio
    - Julgamentos de Nuremberg
  - Consequências
    - Criação da ONU
    - Guerra Fria
    - Divisão da Alemanha
    - Descolonização
`,
      imageAlt:
        'Mapa mental da Segunda Guerra Mundial com os ramos causas, fases, frentes, Holocausto e consequências',
    },
    en: {
      slug: 'world-war-2',
      title: 'World War II mind map',
      description:
        'World War II mind map (1939–1945): causes, stages, theaters, the Holocaust and consequences. Study and edit it free, with no account needed.',
      intro:
        'World War II (1939–1945) was the deadliest conflict in history, drawing in dozens of countries and leaving tens of millions dead. It began with the German invasion of Poland and ended with the surrender of Germany and Japan. This mind map sets out the topic in five branches: causes, stages, theaters, the Holocaust and consequences.',
      sections: [
        {
          heading: 'Causes',
          paragraphs: [
            'The Treaty of Versailles (1919), which ended World War I, forced Germany to give up territory, disarm and pay heavy reparations. The Great Depression of 1929 made unemployment and instability worse across Europe, while totalitarian regimes gained support. Nazi ideology, led by Hitler, called for territorial expansion and racial hierarchy; fascist Italy and militarist Japan also sought larger empires.',
            'The League of Nations failed to stop these ambitions. Appeasement, the policy of handing Hitler territory in the hope of avoiding war, only encouraged further German demands. The German-Soviet pact of 1939 divided eastern Europe into spheres of influence and cleared the way for the invasion of Poland on 1 September 1939.',
          ],
        },
        {
          heading: 'Stages',
          items: [
            'Axis advance (1939–1941): German blitzkrieg overwhelms Poland, Denmark, Norway, the Netherlands and France, which surrenders in June 1940. Italy joins the war on the German side.',
            'Global war (1941): Operation Barbarossa invades the Soviet Union in June, and the Japanese attack on Pearl Harbor in December brings the United States into the conflict.',
            'Allied turning points (1942–1943): Stalingrad, El Alamein and Midway shift the balance, and Italy surrenders in 1943.',
            'Final offensive (1944–1945): D-Day opens the western front, Germany surrenders in May 1945 and Japan in September, after the atomic bombings.',
          ],
        },
        {
          heading: 'Theaters',
          paragraphs: [
            'In Europe, fighting involved land and air campaigns and the occupation of whole countries. In the Pacific, the United States and Japan fought over islands and sea routes in battles such as Midway and Iwo Jima. In North Africa, the Allies drove out Axis forces by 1943. Brazil sent the Brazilian Expeditionary Force (FEB), which fought in Italy in 1944–1945.',
          ],
        },
        {
          heading: 'Holocaust',
          paragraphs: [
            'The Nazi regime persecuted and murdered about six million Jews, as well as Roma people, disabled people, gay men, political prisoners and other groups. The genocide was organized through ghettos and concentration and death camps such as Auschwitz-Birkenau. After the war, Nazi leaders were tried for these crimes at Nuremberg.',
          ],
        },
        {
          heading: 'Consequences',
          paragraphs: [
            'The war killed between 60 and 70 million people and destroyed cities and economies. Europe lost its political dominance, while the United States and the Soviet Union emerged as superpowers and began the Cold War. The United Nations was founded in 1945 to try to keep the peace. Germany was divided, the Marshall Plan helped rebuild Europe, and the weakening of colonial empires sped up decolonization in Asia and Africa.',
          ],
        },
        {
          heading: 'Revising with the map',
          paragraphs: [
            'Pair the map with a timeline: under each branch, add the date that links one event to the next. Then cover the nodes and explain the cause-and-effect chain aloud, from Versailles to the Cold War. When you revise, shuffle the branches and redraw the map from memory; that shows whether you understand the sequence rather than just the layout.',
          ],
        },
      ],
      source: `- World War II (1939–1945)
  - Causes
    - Treaty of Versailles
    - Great Depression
    - Totalitarian regimes
    - Failed appeasement
  - Stages
    - Axis advance (1939–1941)
    - Allied turning points (1942–1943)
    - Final offensive (1944–1945)
  - Theaters
    - Europe and North Africa
    - Pacific
    - Brazilian Expeditionary Force
  - Holocaust
    - Persecution of Jews
    - Death camps
    - Nuremberg trials
  - Aftermath
    - United Nations founded
    - Cold War begins
    - Germany divided
    - Decolonization
`,
      imageAlt:
        'World War II mind map with branches for causes, stages, theaters, the Holocaust and consequences',
    },
  },
}
