# TODO — backlog acionável

Fase 0 (Fundação do projeto) concluída — ver [`CHANGELOG.md`](./CHANGELOG.md). Histórico abaixo para referência; próximos itens acionáveis são os da Fase 1 em [`ROADMAP.md`](./ROADMAP.md).

## Fase 0 — concluída

- [x] Registrar ADR de escolha de gerenciador de monorepo (ADR 0004 — pnpm workspaces + Turborepo)
- [x] Criar `apps/web` (Next.js + Tailwind + shadcn/ui) — shell vazio, sem features
- [x] Criar `apps/api` (NestJS) — shell vazio, health check apenas
- [x] Criar `packages/shared-types` com os contratos `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead`, `Campaign`
- [x] Configurar ESLint + Prettier + TypeScript strict em todo o monorepo
- [x] Configurar GitHub Actions: lint, typecheck, build em cada PR (`.github/workflows/ci.yml`)
- [x] Definir schema Prisma inicial (`Campaign`, `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead`) — ADR 0005. Migration ainda não gerada: requer `DATABASE_URL` de um Postgres real (ver nota abaixo)
- [x] Criar `.env.example` documentando todas as variáveis necessárias
- [x] Atualizar `CHANGELOG.md` ao final da Fase 0

### Pendência que atravessa para a Fase 1

- [ ] Provisionar um Postgres (local/Docker ou gerenciado) e rodar `pnpm --filter @flying-leads/api prisma:migrate` para gerar a primeira migration real a partir de `apps/api/prisma/schema.prisma`.

Próximos itens acionáveis: Fase 1 — Google Maps Search Engine, ver `ROADMAP.md`.
