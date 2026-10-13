# Contributing to Rabisco

> **Resumo em português:** o Rabisco é um app web estático de código aberto (MIT). Para rodar: `pnpm install` e `pnpm dev`. Antes de abrir um PR, rode `pnpm run ci` e `pnpm test:e2e`. Código e commits em inglês, com Conventional Commits. Quem teve um PR aceito pode, se quiser, adicionar o hash do próprio e-mail a `src/ads/exempt.ts` para não ver anúncios (veja abaixo).

Thanks for wanting to help! This guide explains how to run the project, the conventions, and how the ad exemption for contributors works.

## Running the project

Rabisco uses `pnpm` and Node 22 or newer.

- `pnpm install` installs the dependencies.
- `pnpm dev` starts the development server. Sign-in needs your own Google Cloud keys in `.env.local` (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID`).
- `pnpm run ci` runs lint, unit tests with coverage, and the build, as CI does.
- `pnpm test:e2e` runs the end-to-end tests (Google is faked, no keys needed).

## Conventions

- Code, comments, and commit messages in English. Interface text in Portuguese (pt-BR) and English, in `src/i18n/`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…).
- Pull requests come with tests for the change, and CI must pass.

## Ad exemption for contributors

Exempt accounts see no ads and do not download the ad script. Exemption compares the SHA-256 hash of the normalized email (trimmed, lowercase), computed in the browser, with a public list in `src/ads/exempt.ts`.

If you had a pull request accepted, you may add your own hash:

1. Generate it:

   ```
   pnpm hash-email you@example.com
   ```

2. Add the printed hash to `EXEMPT_HASHES` in `src/ads/exempt.ts`, with a comment holding your GitHub username.
3. Open a pull request with that change.

**Heads-up:** the hash is public in the repository, and anyone who already knows your email can check that it is on the list. Joining is optional.
