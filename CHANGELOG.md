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
