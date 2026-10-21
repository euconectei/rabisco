# Criar mapas mentais com IA para o Rabisco

O Rabisco (https://rabisco.dev) importa mapas mentais de markdown simples. Qualquer IA consegue escrever esse markdown, então não precisa de plugin nem de conta extra.

Versão em inglês: https://rabisco.dev/docs/import.md

## Como fazer

1. Cole o prompt abaixo no início da conversa com a IA.
2. Converse normalmente. Quando quiser o mapa, peça: "gere o mapa mental da nossa conversa".
3. Copie o conteúdo do bloco de código que a IA devolver (sem as crases) e salve num arquivo com a extensão .md.
4. No Rabisco, em "Meus arquivos", clique em "Importar" e escolha o arquivo. O mapa abre pronto e já organizado.

## Prompt para colar na IA

```
Quero que a nossa conversa gere um mapa mental para importar no Rabisco (rabisco.dev). Quando eu pedir o mapa, responda SÓ com o mapa, dentro de um único bloco de código markdown, seguindo estas regras:
- Um único item no topo: a ideia central.
- Um tópico por linha, em lista ("- tópico") com dois espaços de indentação por nível (ou com títulos #, ##, ###).
- Texto simples e curto em cada tópico: sem links, tabelas, imagens nem negrito.
- No máximo uns 5 níveis e uns 7 filhos por tópico.
Depois do bloco, diga que eu devo salvar o conteúdo num arquivo .md e importá-lo em "Meus arquivos" > "Importar" no Rabisco.
```

## O formato

- Cada linha é um tópico. Use lista ("- tópico", "* tópico" ou "1. tópico") com dois espaços de indentação por nível, ou títulos (#, ##, ###), que aninham pelo nível.
- Um único item no topo vira a raiz do mapa. Se houver vários, eles ficam sob uma raiz com o nome do arquivo.
- Só texto: links, tabelas, imagens e negrito não são interpretados e aparecem como texto.
- O Rabisco cuida do desenho: posição, cores e ligações. Depois de importar, é só editar como qualquer mapa.

## Exemplo

Este arquivo .md:

```
- Viagem ao Japão
  - Planejamento
    - Passagens
    - Visto
  - Cidades
    - Tóquio
    - Quioto
```

vira um mapa com "Viagem ao Japão" no centro, dois ramos (Planejamento e Cidades) e os tópicos dentro de cada um.
