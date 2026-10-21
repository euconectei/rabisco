# Create mind maps with AI for Rabisco

Rabisco (https://rabisco.dev) imports mind maps from plain markdown. Any AI can write that markdown, so no plugin or extra account is needed.

Portuguese version: https://rabisco.dev/docs/import.pt-BR.md

## How to

1. Paste the prompt below at the start of the conversation with the AI.
2. Talk as usual. When you want the map, ask: "generate the mind map of our conversation".
3. Copy the content of the code block the AI returns (without the backticks) and save it to a file with the .md extension.
4. In Rabisco, under "My files", click "Import" and pick the file. The map opens ready and already laid out.

## Prompt to paste into the AI

```
I want our conversation to produce a mind map to import into Rabisco (rabisco.dev). When I ask for the map, reply with ONLY the map, inside a single markdown code block, following these rules:
- A single top-level item: the central idea.
- One topic per line, as a list ("- topic") indented by two spaces per level (or with #, ##, ### headings).
- Short plain text in every topic: no links, tables, images or bold.
- At most about 5 levels and about 7 children per topic.
After the block, tell me to save its content to a .md file and import it in Rabisco under "My files" > "Import".
```

## The format

- Each line is a topic. Use a list ("- topic", "* topic" or "1. topic") indented by two spaces per level, or headings (#, ##, ###), which nest by level.
- A single top-level item becomes the root of the map. With several, they go under a root named after the file.
- Text only: links, tables, images and bold are not interpreted and show up as text.
- Rabisco handles the drawing: position, colors and links. After importing, edit it like any other map.

## Example

This .md file:

```
- Trip to Japan
  - Planning
    - Flights
    - Visa
  - Cities
    - Tokyo
    - Kyoto
```

becomes a map with "Trip to Japan" at the center, two branches (Planning and Cities) and the topics inside each.
