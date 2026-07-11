# 6. Banco Postgres gerenciado: Supabase, com migrations aplicadas via GitHub Actions

Data: 2026-07-11

## Status

Aceito

## Contexto

ADR 0002 já previa Supabase para Auth; faltava decidir o Postgres em si (ADR 0005 definiu o ORM, mas não o provedor). Precisávamos de uma opção gratuita para viabilizar a Fase 1 sem custo. Além disso, o ambiente de execução usado para gerar este scaffold (sessão remota) só permite tráfego de saída HTTPS via proxy — sem TCP bruto — então nenhuma ferramenta rodando ali consegue abrir uma conexão Postgres direta (nem a _direct connection_ do Supabase, que só resolve em IPv6, nem o _pooler_, bloqueado pela política de rede do sandbox).

## Decisão

- **Provedor:** Supabase Postgres (plano free), consolidando com o Auth já decidido em ADR 0002 — um único provedor para os dois.
- **String de conexão para runtime/migrations:** usar o **Session pooler** do Supabase (`aws-*.pooler.supabase.com:5432`), não a _direct connection_ (`db.<ref>.supabase.co:5432`) — esta última só resolve endereço IPv6, o que quebra em qualquer ambiente/runner sem suporte a IPv6 (incluindo o sandbox usado neste scaffold).
- **Geração da migration inicial:** feita offline, sem conexão com banco nenhum, via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. O resultado foi commitado manualmente na estrutura padrão do Prisma (`apps/api/prisma/migrations/<timestamp>_init/`), produzindo exatamente o mesmo SQL que `prisma migrate dev` geraria com banco disponível.
- **Aplicação da migration:** via workflow dedicado `.github/workflows/db-migrate.yml` (`workflow_dispatch`, disparo manual), que roda `prisma migrate deploy` em um runner do GitHub Actions — esse runner tem rede irrestrita, diferente do sandbox de desenvolvimento. A credencial (`DATABASE_URL`) fica em um GitHub Actions secret, nunca commitada.

## Consequências

- Nenhuma etapa deste projeto depende de rodar migrations a partir de um ambiente com rede restrita — o caminho oficial é sempre via CI.
- `prisma migrate deploy` (não `migrate dev`) é o comando usado em CI: ele só aplica migrations já existentes no repositório, sem precisar de shadow database — seguro para produção.
- Qualquer novo modelo/campo no schema deve gerar uma nova migration com `prisma migrate dev` (localmente, em uma máquina com rede normal) ou com `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ...` offline; o merge da migration para a branch principal é o gatilho para rodar `db-migrate.yml` novamente.
- Superado no futuro se o time decidir usar `prisma migrate deploy` automaticamente a cada push em vez de disparo manual — decisão a ser tomada quando houver ambiente de produção real (Fase 8).
