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

## Stack (planejada)

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Backend:** NestJS, PostgreSQL, Redis, BullMQ
- **IA:** Claude (Anthropic), MCP Servers, OpenAI (opcional)
- **Infra:** GitHub, Vercel, Docker, Supabase (Auth)
- **Mapas:** Google Places API, Google Maps JavaScript API, Geocoding API

## Status

🚧 Fase de planejamento — ver [`ROADMAP.md`](./ROADMAP.md) para a fase ativa. Nenhum código de aplicação foi implementado ainda.

## Skill de engenharia autônoma

Este repositório usa a skill [`autonomous-saas-engineer`](./.claude/skills/autonomous-saas-engineer/SKILL.md), que define o fluxo de trabalho (entender → reconstruir contexto → planejar → implementar → revisar → refatorar → auditar → documentar) seguido em cada tarefa deste projeto.
