# Roadmap

Fases sequenciais. Cada fase só é considerada concluída quando seus critérios de saída são atendidos (código funcionando, testado e documentado — não apenas "funciona na minha máquina").

## Fase 0 — Fundação do projeto (concluída)

- [x] Instalar skill `autonomous-saas-engineer`
- [x] Documentar arquitetura, módulos e loop de agentes (`ARCHITECTURE.md`)
- [x] Escolher e registrar em ADR o monorepo/tooling (ADR 0004 — pnpm workspaces + Turborepo)
- [x] Scaffold do monorepo (`apps/web`, `apps/api`, `packages/shared-types`)
- [x] Configurar lint, format, typecheck e CI (GitHub Actions) desde o início
- [x] Definir schema inicial do banco (PostgreSQL/Prisma) para `Campaign`, `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead` (ADR 0005)

**Critério de saída:** `pnpm install && pnpm exec turbo run lint typecheck build` roda sem erros, sem nenhuma feature de produto ainda implementada. ✅ Verificado localmente; CI (`.github/workflows/ci.yml`) roda o mesmo pipeline em cada PR.

> Banco Postgres provisionado no Supabase (ADR 0006) e migration inicial aplicada com sucesso via `.github/workflows/db-migrate.yml`. Fase 0 100% concluída, incluindo persistência real.

## Fase 1 — Google Maps Search Engine (módulo 2.1)

- [x] Integração com Google Places API (New, Text Search) + Geocoding API (`GooglePlacesService`)
- [x] Endpoint de campanha: nicho, localização, raio, filtros extras (`POST /campaigns`)
- [x] Persistência de `Company` no banco (`PrismaService` + `CampaignsService`)
- [x] Tela de configuração de campanha no dashboard (`apps/web/src/app/campaigns/new`)

**Critério de saída:** dado um nicho + localização, o sistema retorna e persiste uma lista real de empresas com todos os campos do contrato `Company`.

> Implementado e coberto por testes unitários (mocks de `fetch`/Prisma — 16/16 passando) e `lint`/`typecheck`/`build` verdes. **Não testado ponta a ponta com credenciais reais**: este ambiente de desenvolvimento não tem Google Places/Geocoding API key nem alcança o Postgres do Supabase (rede restrita, ver ADR 0006). Validação real fica para quando houver uma API key configurada — ver `TODO.md`.

## Fase 2 — Coletor + Analisador de Website (módulos 2.2, 2.3)

- [x] Job de scraping (fila BullMQ) para empresas com website (`WebsiteAuditProcessor`)
- [x] Extração de performance/SEO/tecnologia — heurística (cheerio + timing), não Lighthouse real neste MVP (ADR 0008)
- [x] Prompt versionado do Website Grader (Claude, tool-use) com saída JSON estruturada (`docs/prompts/website-grader.md`)
- [x] Marcação automática de "sem site" como oportunidade máxima (`WebsiteAuditsService`, síncrono, sem fila)

**Critério de saída:** para uma empresa real, o sistema produz um `WebsiteAudit` completo (ou marca oportunidade, se sem site).

> Implementado e coberto por testes unitários (mocks de `fetch`/Anthropic/Prisma/BullMQ — 39/39 passando em `apps/api`) e `lint`/`typecheck`/`build` verdes. **Não testado ponta a ponta com Redis e `ANTHROPIC_API_KEY` reais** — mesma limitação de rede deste ambiente (ver TODO.md e ADR 0006/0007).

## Fase 3 — Opportunity Score

- [x] Regras determinísticas de score (sem site, site antigo, site lento, sem HTTPS, SEO fraco) — `computeRuleBasedScore`
- [x] Combinação com `opportunity_score` da IA avaliadora — `combineScores` (média simples, ver ADR 0009)
- [x] Ordenação da fila de trabalho por score — `GET /companies` e `GET /campaigns/:id`, via `sortByOpportunity`

**Critério de saída:** lista de empresas de uma campanha ordenada por oportunidade, com score explicável (breakdown visível).

> Implementado e coberto por testes unitários (24 novos testes — 56/56 em `apps/api`) e `lint`/`typecheck`/`build` verdes. Fórmula de combinação registrada em ADR 0009. Mesma limitação de rede das fases anteriores: não validado com Redis/Anthropic reais neste ambiente.

## Fase 4 — Gerador de Website + Deploy automático (módulos 2.5, 2.6)

- [x] Integração com skill de geração de UI — `ContentGeneratorService` (Claude via Messages API/tool-use, gera conteúdo estruturado, não código bruto; ver ADR 0010)
- [x] Pipeline de geração → push para GitHub → deploy Vercel — `WebsiteGenerationProcessor` (`ContentGeneratorService` → `renderSiteFiles` → `GitHubDeployService` → `VercelDeployService`)
- [x] Persistência do link de preview associado ao lead — `Lead.previewUrl`

**Critério de saída:** para um lead com alta oportunidade, o sistema gera um website completo e publica um link de preview funcional, sem intervenção manual.

> Implementado e coberto por testes unitários (23 novos testes — 79/79 em `apps/api`) e `lint`/`typecheck`/`build` verdes. Duas decisões de escopo, discutidas com o usuário e registradas em ADR 0010: (1) geração via chamada única à API do Claude com saída estruturada, não uma sessão completa do Claude Agent SDK; (2) o pipeline roda "sem intervenção manual" depois de disparado, mas o disparo em si é explícito por empresa (`POST /companies/:id/generate-website`), não automático para toda empresa com alta oportunidade — evita gastar dinheiro em IA/GitHub/Vercel sem uma ação deliberada. Não testado com `GITHUB_TOKEN`/`VERCEL_TOKEN` reais nem contra um `GENERATED_SITES_REPO` real — mesma limitação das fases anteriores.

## Fase 5 — Fila de Aprovação Manual (módulo 2.7)

- [x] Tela de revisão: análise antiga vs. preview novo vs. mensagem sugerida — `apps/web/src/app/leads`
- [x] Edição de mensagem antes do envio — `PATCH /leads/:id`
- [x] Ação explícita "Enviar" (sem envio automático em nenhuma hipótese) — `POST /leads/:id/send`

**Critério de saída:** nenhum envio acontece sem clique humano; auditoria registra quem aprovou.

> Implementado e coberto por testes unitários (17 novos testes — 88/88 em `apps/api`) e `lint`/`typecheck`/`build` verdes. A mensagem de abordagem (Agent 8) passou a ser gerada automaticamente dentro do mesmo job da Fase 4, não como um trigger separado (ver ADR 0011). `POST /leads/:id/send` só grava a aprovação (quem, quando) — o envio real via WhatsApp Business API é a própria Fase 6, ainda não implementada; até lá, nenhum envio de fato acontece, então o critério de saída já vale por definição.

## Fase 6 — WhatsApp (módulo 2.8)

- [x] Integração com WhatsApp Business API oficial (Meta Cloud API, mensagem via template pré-aprovado — `WhatsappService`)
- [x] Registro de histórico de contato (evita duplicidade) — model `ContactAttempt`; `POST /leads/:id/send` recusa reenvio de um lead que já saiu de `not_sent`
- [x] Fallback documentado para envio manual quando API oficial não se aplica — link `wa.me` (`buildWhatsappManualLink`)

**Critério de saída:** envio de mensagem real via canal oficial, com log de auditoria e sem uso de automação não oficial.

> Implementado e coberto por testes unitários (mocks de `fetch`/Prisma). ADR 0012 registra as decisões técnicas: Cloud API direta (sem BSP), template pré-aprovado como única forma de mensagem inicial (exigência da própria Cloud API para contatos iniciados pela empresa), `POST /leads/:id/send` reaproveitado como único ponto de disparo (conforme já prescrito na ADR 0011). O cadastro/aprovação do template junto à Meta é uma pendência de infraestrutura real — ver `TODO.md`, mesmo padrão das pendências de Google Cloud billing e tokens do GitHub/Vercel.

## Fase 7 — CRM + Dashboard (módulos 2.9, 2.10)

- [x] Status de funil por lead (`Não enviado → ... → Cliente/Perdido`) — `PATCH /leads/:id/status` + histórico em `LeadStatusEvent` (ADR 0013)
- [x] Dashboard com métricas do dia/período — `GET /dashboard/metrics` + home do `apps/web`
- [x] Follow-up (lembretes, próxima ação) — `Lead.nextActionAt`/`nextActionNote`, vencidos listados no dashboard

**Critério de saída:** dashboard reflete em tempo real os números do funil descritos em `README.md`.

> Implementado e coberto por testes unitários (8 novos — 108/108 em `apps/api`) e `lint`/`typecheck`/`build` verdes. ADR 0013 registra as decisões: histórico de transições em tabela de eventos (necessário para métricas por período), atualização manual de status restrita a leads já enviados (a única saída de `not_sent` continua sendo o gate de aprovação), follow-up *pull* (o dashboard lista vencidos; sem notificação push no MVP) e corte `finalScore >= 50` para "oportunidade identificada". Mesma limitação das fases anteriores: não validado contra Postgres real neste ambiente.

## Fase 8 — Hardening para produção

- [x] Testes automatizados (unit + e2e) cobrindo os módulos 2.1–2.9 — unitários desde a Fase 1 (um spec por serviço); e2e agora cobre autenticação, ValidationPipe (400s), 404s e o shape do dashboard sem exigir banco
- [x] Autenticação/autorização (Supabase Auth) — `AuthGuard` global verificando JWT HS256 do Supabase (`SUPABASE_JWT_SECRET`); sem o secret a API roda aberta em modo dev com aviso (ADR 0014); multi-tenant **não se aplica** ao MVP single-operator
- [x] Observabilidade (logs estruturados) — `nestjs-pino`: JSON em produção, pretty em dev, log automático de request; métricas/alertas de infra ficam com o ambiente de deploy (documentado)
- [x] Revisão de segurança — `helmet`, rate limiting global (100 req/60s, `@nestjs/throttler`), CORS restrito a `CORS_ORIGIN`, `forbidNonWhitelisted` no ValidationPipe, secrets só por env, postura LGPD documentada na ADR 0014 (dados públicos de estabelecimentos; exclusão em cascata por FK)
- [x] Auditoria de acessibilidade nos sites gerados — baseline por construção no template (lang, landmarks, headings, aria, noopener, OpenGraph) com testes que quebram o build em regressão; Lighthouse real fica para a validação com site publicado (`TODO.md`)

**Critério de saída:** sistema aprovado nos critérios da skill `autonomous-saas-engineer` (Agent 5 — Engineering Auditor) em todas as categorias.

> Fase final do roadmap. Pendências que dependem de infra/credenciais reais (login do dashboard contra um projeto Supabase real, Lighthouse contra site publicado) estão em `TODO.md` — não são código novo, são validação.

---

Backlog imediato e acionável: ver [`TODO.md`](./TODO.md).
