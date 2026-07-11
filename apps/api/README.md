# @flying-leads/api

Backend NestJS do Flying Leads Generator. Ver [`ARCHITECTURE.md`](../../ARCHITECTURE.md) na raiz do repositório para o desenho completo do pipeline e dos módulos que este serviço vai orquestrar.

## Estado atual

Shell mínimo (Fase 0 do [`ROADMAP.md`](../../ROADMAP.md)): apenas um endpoint `GET /health` e o schema Prisma inicial (`prisma/schema.prisma`), ainda sem migration gerada.

## Scripts

```bash
pnpm --filter @flying-leads/api start:dev     # desenvolvimento
pnpm --filter @flying-leads/api build          # build de produção
pnpm --filter @flying-leads/api lint           # eslint
pnpm --filter @flying-leads/api typecheck      # tsc --noEmit
pnpm --filter @flying-leads/api test           # unit tests
pnpm --filter @flying-leads/api test:e2e       # e2e tests
pnpm --filter @flying-leads/api prisma:generate
pnpm --filter @flying-leads/api prisma:migrate # requer DATABASE_URL
```

## Variáveis de ambiente

Ver `.env.example` na raiz do repositório.
