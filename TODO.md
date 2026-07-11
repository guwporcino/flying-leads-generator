# TODO — backlog acionável

Fases 0 e 1 concluídas — ver [`CHANGELOG.md`](./CHANGELOG.md). Histórico abaixo para referência.

## Fase 1 — pendência: validação com credenciais reais

Código completo e testado (mocks) — falta só validar contra a API do Google de verdade:

- [ ] Criar um projeto no Google Cloud, habilitar **Places API (New)** e **Geocoding API**, gerar uma API key
- [ ] Adicionar `GOOGLE_PLACES_API_KEY` e `GOOGLE_GEOCODING_API_KEY` (pode ser a mesma key se não houver restrição por API) ao `.env` local e/ou como secret do GitHub Actions
- [ ] Rodar `POST /campaigns` de ponta a ponta (precisa também do Postgres alcançável — rodar localmente ou via um ambiente com rede completa, não este sandbox)
- [ ] Ajustar `PLACES_FIELD_MASK`/mapeamento em `google-places.types.ts` caso o formato real da resposta divirja do esperado

Próximos itens acionáveis depois disso: Fase 2 — Coletor + Analisador de Website, ver `ROADMAP.md`.

---

## Fase 0 — concluída

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
