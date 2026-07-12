# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Added

- Skill de engenharia autônoma `autonomous-saas-engineer` instalada em `.claude/skills/`.
- Documentação de arquitetura (`ARCHITECTURE.md`): pipeline completo, contratos de dados dos 10 módulos (Google Maps Search, Coletor, Analisador de Website, IA avaliadora, Opportunity Score, Gerador de Website, Deploy automático, Fila de Aprovação, WhatsApp, CRM/Dashboard) e loop de 8 agentes de geração por empresa.
- Roadmap faseado (`ROADMAP.md`) com critérios de saída por fase, da Fase 0 (fundação) até a Fase 8 (hardening para produção).
- Backlog acionável da Fase 0 (`TODO.md`).
- ADR 0001 (processo de ADRs), ADR 0002 (stack e estrutura de monorepo) e ADR 0003 (WhatsApp via API oficial, sem automação não-oficial).
- Scaffold do monorepo (Fase 0 concluída): pnpm workspaces + Turborepo, TypeScript strict, ESLint e Prettier (ADR 0004).
- `packages/shared-types`: contratos `Campaign`, `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead`.
- `apps/api` (NestJS): shell com endpoint `GET /health`, testes unitário e e2e, schema Prisma inicial cobrindo os cinco models de domínio (ADR 0005).
- `apps/web` (Next.js + Tailwind + shadcn/ui): shell com página placeholder do dashboard.
- CI (`.github/workflows/ci.yml`): instala dependências, gera o Prisma Client e roda lint/typecheck/build em cada PR.
- `.env.example` documentando todas as variáveis necessárias (banco, Redis, Google Maps/Places, Anthropic/OpenAI, GitHub/Vercel, Supabase, WhatsApp Business API).
- Migration inicial do Prisma (`apps/api/prisma/migrations/20260711225715_init`), gerada offline (sem depender de conexão com banco) e workflow `.github/workflows/db-migrate.yml` para aplicá-la via `prisma migrate deploy` em CI. Banco escolhido: Supabase Postgres, plano free (ADR 0006). Aplicada com sucesso ([run #1](https://github.com/guwporcino/flying-leads-generator/actions/runs/29171619729)) — Fase 0 concluída de ponta a ponta, incluindo persistência real.
- **Fase 1 — Google Maps Search Engine:**
  - `PrismaService`/`PrismaModule` (global) integrando o Prisma Client ao NestJS; `ValidationPipe` global e CORS habilitados em `apps/api`.
  - `GooglePlacesService`: Geocoding API (endereço → lat/lng) e Places API (New) Text Search (nicho + localização → lugares), com mapeamento tipado para o contrato `Company` e 6 testes unitários (mocks de `fetch`).
  - `CampaignsModule`: `POST /campaigns` (geocodifica, busca no Google, aplica filtros extras client-side, persiste `Campaign` + `Company`), `GET /campaigns`, `GET /campaigns/:id`; DTOs validados com `class-validator`; 6 testes unitários (mocks de Prisma/GooglePlacesService).
  - `CompaniesModule`: `GET /companies?campaignId=`, `GET /companies/:id`.
  - `apps/web`: formulário de nova campanha (`/campaigns/new`) com shadcn/ui (Input, Select, Checkbox, Card) — busca empresas e lista o resultado.
  - CI (`ci.yml`) agora também roda os testes unitário e e2e do `apps/api`.
  - Não testado com credenciais reais (sem Google API key nem acesso ao Postgres neste ambiente) — pendência registrada em `TODO.md`.
- **Fase 2 — Coletor + Analisador de Website:**
  - `ScraperService`: fetch + parsing (cheerio) de título, descrição, tecnologia, HTTPS, responsividade, copyright, redes sociais, formulário/mapa/blog, contagem aproximada de páginas e amostragem de links quebrados. 10 testes unitários.
  - `WebsiteGraderService`: avaliação via Claude (Anthropic SDK) usando tool-use para saída estruturada garantida; prompt versionado em `docs/prompts/website-grader.md`. 3 testes unitários.
  - `heuristic-scores.ts`: aproximação de performance/SEO (não é Lighthouse real — ver ADR 0008). 4 testes unitários.
  - `WebsiteAuditsModule`: fila BullMQ (`website-audit`) via `@nestjs/bullmq`/Redis, `WebsiteAuditsService` (enfileira empresas com site, marca `hasWebsite: false` diretamente para as sem site) e `WebsiteAuditProcessor` (orquestra scraper → grader → persistência). 8 testes unitários.
  - `CampaignsService` agora enfileira uma auditoria por empresa persistida logo após criar a campanha; falha ao enfileirar não derruba a criação da campanha.
  - `GET /companies/:id` passa a incluir o `websiteAudit` relacionado.
  - ADR 0008 registrando as três decisões técnicas da fase (scraping heurístico sem browser headless, grading via Claude com tool-use, fila BullMQ disparada pelo `CampaignsService`).
  - Não testado com Redis nem `ANTHROPIC_API_KEY` reais neste ambiente — pendência registrada em `TODO.md`.
- **Fase 3 — Opportunity Score:**
  - `computeRuleBasedScore`: regra determinística não-aditiva (sem site=100, site desatualizado=90, lento=74, SEO fraco=60, sem HTTPS=55, saudável=15) com razão explicável.
  - `combineScores`: combina o score determinístico com o `opportunity_score` da IA por média simples (empresas sem site não passam pela média — score fica 100 direto). Fórmula registrada em ADR 0009.
  - `OpportunityScoreService` grava o `OpportunityScore` dentro do mesmo pipeline da Fase 2 — logo após `WebsiteAuditsService.markAsOpportunity` (sem site) ou `WebsiteAuditProcessor.process` (com site), espelhando a sequência Agent 3 → Agent 4 do loop de agentes.
  - `GET /companies` e `GET /campaigns/:id` passam a ordenar as empresas por `opportunityScore.finalScore` descendente, com pendentes (ainda na fila) por último (`sortByOpportunity`).
  - 24 novos testes unitários (56/56 no total em `apps/api`).
