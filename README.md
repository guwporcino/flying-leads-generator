# Flying Leads Generator

Plataforma que encontra empresas locais com presença digital fraca (sem site, site desatualizado ou site com baixo desempenho), gera automaticamente uma proposta de novo website com IA, publica um preview e organiza a abordagem comercial (WhatsApp + CRM) sob aprovação humana em todas as etapas de contato.

> Nenhuma mensagem é enviada sem confirmação de um operador humano.

## Pipeline

```
Configuração da campanha
        │
        ▼
Google Maps Search Engine
        │
        ▼
Coletor de dados da empresa
        │
        ▼
Analisador de Website
        │
        ▼
Score de Oportunidade
        │
        ▼
Gerador de novo website (Claude + UI Skill)
        │
        ▼
Deploy automático (Vercel)
        │
        ▼
Link de Preview disponível
        │
        ▼
Fila de Aprovação Manual
        │
        ▼
Envio via WhatsApp Business API (oficial)
        │
        ▼
CRM + Follow-up
```

Descrição detalhada de cada módulo, do loop de agentes de IA e das decisões de arquitetura: ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Documentação

| Documento                              | Conteúdo                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Módulos, contratos de dados, loop de agentes, stack técnica |
| [`ROADMAP.md`](./ROADMAP.md)           | Fases de implementação e critérios de saída de cada fase    |
| [`TODO.md`](./TODO.md)                 | Backlog acionável da fase atual                             |
| [`CHANGELOG.md`](./CHANGELOG.md)       | Histórico de mudanças (Keep a Changelog)                    |
| [`docs/adr/`](./docs/adr)              | Decisões de arquitetura registradas (ADRs)                  |

## Rodando localmente

Pré-requisitos: Node 22+, pnpm 10+, Docker (para Postgres/Redis locais).

```bash
# 1. Dependências
pnpm install

# 2. Infra local (Postgres na 5432, Redis na 6379)
docker compose up -d

# 3. Variáveis de ambiente da API
cp .env.example apps/api/.env
# Edite apps/api/.env: para rodar com o docker-compose acima, use
#   DATABASE_URL="postgresql://flying_leads:flying_leads@localhost:5432/flying_leads"
#   REDIS_URL="redis://localhost:6379"
# e preencha as chaves externas que quiser testar de verdade
# (GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN, VERCEL_TOKEN,
#  WHATSAPP_*...). Sem elas, os módulos correspondentes degradam de forma
#  explícita (ex.: WhatsApp cai no fallback de link manual).
# SUPABASE_JWT_SECRET vazio = API aberta em modo dev (ver ADR 0014).

# 4. Migrations + Prisma Client
pnpm --filter @flying-leads/api exec prisma migrate deploy
pnpm --filter @flying-leads/api prisma:generate

# 5. Suba a API (porta 3000) e o dashboard (porta 3001), em terminais separados
pnpm --filter @flying-leads/api start:dev
pnpm --filter @flying-leads/web dev
```

Dashboard: <http://localhost:3001> · API: <http://localhost:3000/health>

Testes e verificação completa:

```bash
pnpm exec turbo run lint typecheck build   # monorepo inteiro
pnpm --filter @flying-leads/api test       # unitários
pnpm --filter @flying-leads/api test:e2e   # e2e (não precisa de banco)
```

## Stack (planejada)

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Backend:** NestJS, PostgreSQL, Redis, BullMQ
- **IA:** Claude (Anthropic), MCP Servers, OpenAI (opcional)
- **Infra:** GitHub, Vercel, Docker, Supabase (Auth)
- **Mapas:** Google Places API, Google Maps JavaScript API, Geocoding API

## Status

✅ Fases 0 a 8 do roadmap concluídas — o pipeline completo existe: busca no Google Maps → auditoria de site → Opportunity Score → geração + deploy do site → fila de aprovação → envio via WhatsApp oficial → CRM com funil e dashboard, com autenticação, rate limiting e logs estruturados. Ainda pendente: validação com credenciais/infra reais (Google billing, Anthropic, GitHub/Vercel, template do WhatsApp na Meta, projeto Supabase com Auth) — checklist em [`TODO.md`](./TODO.md) e guia em "Rodando localmente" acima.

## Skill de engenharia autônoma

Este repositório usa a skill [`autonomous-saas-engineer`](./.claude/skills/autonomous-saas-engineer/SKILL.md), que define o fluxo de trabalho (entender → reconstruir contexto → planejar → implementar → revisar → refatorar → auditar → documentar) seguido em cada tarefa deste projeto.
