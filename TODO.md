# TODO — backlog acionável

Fases 0, 1, 2 e 3 concluídas — ver [`CHANGELOG.md`](./CHANGELOG.md). Histórico abaixo para referência.

## Fase 3 — pendência

Sem pendência própria além da validação de ponta a ponta que já está registrada na Fase 2 (o Opportunity Score roda dentro do mesmo pipeline). Próximos itens acionáveis: Fase 4 — Gerador de Website + Deploy automático, ver `ROADMAP.md`.

---

## Fase 2 — pendência: validação com Redis + Claude reais

Código completo e testado (mocks) — falta validar contra infraestrutura real:

- [ ] Provisionar um Redis (ex.: Upstash free tier, Redis Cloud free tier) e configurar `REDIS_URL`
- [ ] Confirmar que `ANTHROPIC_API_KEY` funciona (billing/créditos disponíveis) e rodar `WebsiteGraderService.grade()` contra a API real
- [ ] Rodar o pipeline completo (`CampaignsService.create()` → fila → `WebsiteAuditProcessor`) de ponta a ponta com Postgres, Redis e as duas API keys reais — precisa de um ambiente com rede irrestrita, não este sandbox
- [ ] Revisitar os scores heurísticos de `heuristic-scores.ts` (`performanceScore`/`seoScore`) com dados reais; considerar Lighthouse real se a precisão heurística for insuficiente (ver ADR 0008)

Próximos itens acionáveis depois disso: Fase 3 — Opportunity Score, ver `ROADMAP.md`.

---

## Fase 1 — pendência: validação com credenciais reais

Código completo e testado (mocks). Já existe uma API key do Google configurada, mas o projeto do Google Cloud dono dela **não tem billing habilitado** — Geocoding retorna `REQUEST_DENIED` ("You must enable Billing...") e Places API (New) retorna `403 PERMISSION_DENIED`. Confirmado batendo direto nas duas APIs via HTTPS a partir deste ambiente (sem passar pelo `apps/api`).

- [ ] Habilitar billing no projeto do Google Cloud dono da API key (console.cloud.google.com/project/_/billing/enable)
- [ ] Confirmar que **Places API (New)** e **Geocoding API** estão habilitadas nesse projeto (Billing sozinho pode não bastar se as APIs nunca foram ativadas)
- [ ] Adicionar `GOOGLE_PLACES_API_KEY`/`GOOGLE_GEOCODING_API_KEY` ao `.env` local (não commitar) para rodar `apps/api` de verdade
- [ ] Rodar `POST /campaigns` de ponta a ponta (precisa também do Postgres alcançável — rodar localmente ou via um ambiente com rede completa, não este sandbox)
- [ ] Ajustar `PLACES_FIELD_MASK`/mapeamento em `google-places.types.ts` caso o formato real da resposta divirja do esperado

Próximos itens acionáveis depois disso: Fase 2 — Coletor + Analisador de Website, ver `ROADMAP.md`.

---

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
