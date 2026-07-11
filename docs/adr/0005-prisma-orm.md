# 5. ORM: Prisma

Data: 2026-07-11

## Status

Aceito

## Contexto

`apps/api` (NestJS) precisa de acesso tipado ao PostgreSQL para os models `Campaign`, `Company`, `WebsiteAudit`, `OpportunityScore` e `Lead` definidos em `ARCHITECTURE.md`. A skill exige "strongly typed code" e migrations versionadas.

## Decisão

- Prisma como ORM: schema declarativo único (`apps/api/prisma/schema.prisma`) gera tanto o client tipado quanto o histórico de migrations, eliminando drift entre tipos de aplicação e schema de banco.
- Os models do Prisma espelham os contratos de `packages/shared-types`; campos livres de formato (ex.: `aiCriteriaScores`, `aiFindings`) ficam como `Json` e são validados/tipados na camada de aplicação usando os tipos de `shared-types` (evita duplicar enums com acentuação em `WebsiteGrade` dentro do Prisma).
- `LeadStatus` é o único enum nativo do Prisma, pois seus valores já são identificadores ASCII válidos e idênticos ao union type TypeScript correspondente.

## Consequências

- Nenhuma migration foi gerada neste commit: `prisma migrate dev` precisa de um `DATABASE_URL` de um Postgres real, indisponível no ambiente de scaffold. O schema está pronto; a primeira migration deve ser gerada rodando `pnpm --filter @flying-leads/api prisma:migrate` assim que houver banco disponível (ver `TODO.md`).
- Alterações de schema exigem regenerar o client (`prisma:generate`) — isso deve ser adicionado ao pipeline de build/CI do `apps/api` antes de ir para produção.
