# TODO — backlog acionável

Fase 0 (Fundação do projeto) concluída — ver [`CHANGELOG.md`](./CHANGELOG.md). Histórico abaixo para referência; próximos itens acionáveis são os da Fase 1 em [`ROADMAP.md`](./ROADMAP.md).

## Fase 0 — concluída

- [x] Registrar ADR de escolha de gerenciador de monorepo (ADR 0004 — pnpm workspaces + Turborepo)
- [x] Criar `apps/web` (Next.js + Tailwind + shadcn/ui) — shell vazio, sem features
- [x] Criar `apps/api` (NestJS) — shell vazio, health check apenas
- [x] Criar `packages/shared-types` com os contratos `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead`, `Campaign`
- [x] Configurar ESLint + Prettier + TypeScript strict em todo o monorepo
- [x] Configurar GitHub Actions: lint, typecheck, build em cada PR (`.github/workflows/ci.yml`)
- [x] Definir schema Prisma inicial (`Campaign`, `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead`) — ADR 0005
- [x] Gerar a migration inicial (`apps/api/prisma/migrations/20260711225715_init`) offline via `prisma migrate diff --from-empty` — não precisa de conexão com banco
- [x] Criar `.env.example` documentando todas as variáveis necessárias
- [x] Atualizar `CHANGELOG.md` ao final da Fase 0

### Banco de dados — concluído

Banco escolhido: Supabase (Postgres), ver ADR 0006. Migration inicial aplicada com sucesso via `.github/workflows/db-migrate.yml` ([run #1](https://github.com/guwporcino/flying-leads-generator/actions/runs/29171619729)) — as 5 tabelas (`campaigns`, `companies`, `website_audits`, `opportunity_scores`, `leads`) já existem no Supabase.

Próximos itens acionáveis: Fase 1 — Google Maps Search Engine, ver `ROADMAP.md`.
