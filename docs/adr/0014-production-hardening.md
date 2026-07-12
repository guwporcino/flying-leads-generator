# 14. Hardening para produção (Fase 8)

Data: 2026-07-12

## Status

Aceito

## Contexto

ROADMAP Fase 8 fecha o MVP: autenticação/autorização, observabilidade, revisão de segurança (secrets, rate limiting, LGPD) e acessibilidade/performance dos sites gerados. Diferente das fases anteriores, não adiciona feature — endurece o que existe. As decisões abaixo equilibram proteção real com a necessidade de continuar rodando localmente sem fricção (o dashboard ainda é operado por uma única pessoa).

## Decisão

### 1. Autenticação: verificação de JWT do Supabase no backend, com modo dev explícito

- `AuthGuard` global no `apps/api`: exige `Authorization: Bearer <jwt>` e verifica a assinatura HS256 com `SUPABASE_JWT_SECRET` (o "JWT Secret" do painel do Supabase) usando `jose`. Emissor/validade verificados; o payload (`sub`, `email`) fica disponível em `request.user`.
- **Sem `SUPABASE_JWT_SECRET` configurado, o guard permite tudo e loga um aviso** no boot. Racional: é o mesmo contrato dos outros serviços deste projeto (WhatsApp sem credenciais → fallback manual; ver ADR 0012) — o sistema degrada explicitamente, não quebra. Produção define o secret; dev local roda aberto sem setup extra.
- `@Public()` marca rotas fora da autenticação — hoje só `GET /health` (probe de infraestrutura).
- O login no `apps/web` (tela de login com `@supabase/supabase-js`, sessão, envio do token nas chamadas) exige um projeto Supabase com Auth configurado — fica registrado em `TODO.md` como pendência de validação real, junto com as demais credenciais. O guard já está pronto para recebê-lo.
- Multi-tenant: **não se aplica** neste MVP (um operador, um funil). Revisitar se o produto virar multi-usuário.

### 2. Superfície HTTP: helmet, rate limiting e CORS restrito

- `helmet` nos headers de resposta (padrões de mercado, custo zero).
- `@nestjs/throttler` global: 100 requisições / 60s por IP (o dashboard é single-operator; qualquer coisa acima disso é bot/abuso). `/health` fica isento junto com o `@Public()`.
- CORS deixa de ser aberto (`enableCors()` sem argumentos) e passa a aceitar só a origem de `CORS_ORIGIN` (default `http://localhost:3001`, onde o `apps/web` roda em dev).
- `ValidationPipe` ganha `forbidNonWhitelisted: true` — payload com campo desconhecido vira 400 em vez de ser silenciosamente ignorado.

### 3. Observabilidade: logs estruturados com `nestjs-pino`

- `nestjs-pino` como logger da aplicação: JSON por linha em produção (parseável por qualquer agregador), `pino-pretty` em dev (`NODE_ENV !== 'production'`). Loga cada request HTTP (método, rota, status, duração) automaticamente.
- Os `Logger` do Nest já usados nos módulos continuam funcionando — o pino intercepta o transporte, nenhum call site muda.
- Métricas/alertas de infraestrutura (Prometheus, uptime checks) são responsabilidade do ambiente de deploy, não deste repositório — fica documentado em `TODO.md`.

### 4. LGPD e dados coletados

- O sistema coleta **somente dados públicos de estabelecimentos comerciais** (Google Places: nome, telefone público, endereço, avaliações) — dados de pessoa jurídica/estabelecimento, não dados pessoais de consumidores. Ainda assim: telefone/WhatsApp de contato pode identificar pessoa física (MEI); por isso valem as regras já adotadas: contato só via canal oficial com aprovação humana (ADR 0003), histórico auditável (`ContactAttempt`, `LeadStatusEvent`) e nenhum dado sensível é coletado.
- Direito de exclusão: apagar a `Company` remove em cascata auditoria, score, lead e históricos (FKs `onDelete: Cascade` já existentes) — a exclusão é uma operação de banco única e completa.
- Secrets: nunca commitados (`.env` no `.gitignore` desde a Fase 0); em produção, gerenciados pelo ambiente (GitHub Actions secrets, Vercel env vars).

### 5. Acessibilidade e performance dos sites gerados

- O template de `renderSiteFiles` (ADR 0010) passa a garantir baseline de acessibilidade **por construção**: `lang="pt-BR"`, `<meta name="viewport">`, landmarks semânticos (`header/main/section/footer`), headings hierárquicos, texto alternativo/aria onde há ícones ou links de ação, contraste alto no tema padrão. Testes unitários afirmam esses invariantes — regressão de acessibilidade quebra o build.
- Auditoria Lighthouse real (meta 95+, ARCHITECTURE §2.5) só faz sentido contra um site publicado — pendência de validação real em `TODO.md`, junto com o restante da infra.

## Consequências

- Nenhuma env var nova é obrigatória para rodar local: sem `SUPABASE_JWT_SECRET` a API roda aberta (com aviso), CORS default já aponta para o web dev server.
- Com o secret configurado, **toda** rota exceto `/health` exige JWT válido do Supabase — o `apps/web` precisará do login implementado antes de apontar para uma API protegida (pendência registrada).
- `forbidNonWhitelisted` é breaking para clientes que enviavam campos extras — nenhum cliente nosso o faz (o `apps/web` envia exatamente os DTOs).
- Novas dependências: `jose`, `helmet`, `@nestjs/throttler`, `nestjs-pino`/`pino-http`/`pino-pretty` — todas mainstream e de manutenção ativa.
