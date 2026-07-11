# 4. Gerenciador de monorepo: pnpm workspaces + Turborepo

Data: 2026-07-11

## Status

Aceito

## Contexto

ADR 0002 definiu a estrutura de monorepo (`apps/web`, `apps/api`, `packages/shared-types`) mas deixou em aberto a ferramenta de workspace/build orchestration, a ser confirmada antes do scaffold (ver `TODO.md`, Fase 0).

## Decisão

- **Gerenciador de pacotes:** pnpm (workspaces nativos, instalação rápida, `node_modules` eficiente via symlinks/hardlinks — reduz custo em CI).
- **Orquestração de build/lint/typecheck:** Turborepo (`turbo.json` na raiz), com cache local e pipeline (`build`, `lint`, `typecheck`, `dev`) respeitando dependências entre pacotes (`dependsOn: ["^build"]`) para que `packages/shared-types` seja buildado antes de `apps/api`/`apps/web`.
- **TypeScript:** `tsconfig.base.json` na raiz com `strict: true` e afins; cada pacote/app estende essa base e ajusta apenas o necessário (ex.: `jsx` no `apps/web`).
- **Lint:** cada app mantém sua própria configuração de ESLint (Next.js e NestJS têm presets e regras específicas do framework que não convivem bem com um único flat-config compartilhado); Prettier é compartilhado e único na raiz para garantir formatação consistente em todo o repositório.

## Consequências

- `pnpm install` na raiz resolve todas as dependências do monorepo de uma vez.
- CI roda `turbo run lint typecheck build` e se beneficia de cache/paralelismo entre `apps/web`, `apps/api` e `packages/shared-types`.
- Divergência de regra de lint entre `apps/web` e `apps/api` é aceita como trade-off consciente em favor de usar os presets oficiais de cada framework.
