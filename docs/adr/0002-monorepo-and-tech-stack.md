# 2. Monorepo e stack técnica

Data: 2026-07-11

## Status

Aceito (nível de arquitetura) — ferramenta específica de workspace (pnpm/Turborepo vs. alternativas) permanece aberta e deve ser confirmada em ADR próprio antes do scaffold da Fase 0 (ver `TODO.md`).

## Contexto

O sistema é composto por módulos claramente separáveis (busca, scraping, avaliação por IA, geração de site, deploy, aprovação, envio, CRM) que compartilham tipos de dados (`Company`, `WebsiteAudit`, `Lead`) e precisam evoluir em conjunto no início do projeto, mas devem poder ser extraídos como serviços independentes depois, sem reescrita.

## Decisão

- **Estrutura:** monorepo com `apps/web` (frontend) e `apps/api` (backend), mais `packages/shared-types` para contratos compartilhados — ver `ARCHITECTURE.md` §5.
- **Frontend:** Next.js + React + Tailwind CSS + shadcn/ui. Justificativa: é o mesmo stack exigido para os websites gerados para os leads (módulo 2.5), reduzindo a superfície de ferramentas do time.
- **Backend:** NestJS (arquitetura modular, DI nativa, alinhada com Clean Architecture/SOLID exigidos pela skill) + PostgreSQL (dados relacionais de campanhas/leads/CRM) + Redis + BullMQ (orquestração do loop de agentes como jobs de fila, não chamadas síncronas).
- **IA:** Claude (Claude Code / Claude API) como motor principal de avaliação e geração; OpenAI listado como opcional/fallback, não como dependência obrigatória.
- **Infra:** GitHub (source + deploy trigger), Vercel (hosting dos sites gerados e do dashboard), Docker (ambiente local/CI dos serviços de backend), Supabase Auth (autenticação, evita implementar auth do zero).
- **Mapas:** Google Places API, Google Maps JavaScript API, Geocoding API — únicas fontes de dados geográficos/comerciais na Fase 1.

## Consequências

- Cada módulo do pipeline pode ser implementado como um serviço/worker dentro de `apps/api`, comunicando-se via fila — facilita extração futura em microsserviço se necessário.
- `packages/shared-types` evita duplicação e drift de contrato entre backend e frontend.
- Dependência forte em serviços pagos de terceiros (Google Places, Vercel, Supabase, Anthropic) — custos variáveis por campanha devem ser monitorados (ver Fase 8, observabilidade).
