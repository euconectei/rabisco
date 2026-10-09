# Rabisco

Mapas mentais e fluxos desenhados à mão no mesmo canvas, salvos no seu Google Drive.
Feito sobre o [Excalidraw](https://github.com/excalidraw/excalidraw). Em desenvolvimento.

**English:** mind maps and hand-drawn flows on the same canvas, saved to your Google Drive. Built on Excalidraw. Work in progress.

## Desenvolvimento

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm run ci     # lint + testes com cobertura + build
pnpm test:e2e   # Playwright
```

## Deploy

Cada push na `main` publica no Cloudflare Pages (`https://rabisco.euconectei.com.br`) depois do CI, se os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estiverem configurados no repositório. Sem eles, o job de deploy só registra um aviso e não faz nada.

Licença: MIT.
