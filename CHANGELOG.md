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
- **Fase 4 — Gerador de Website + Deploy automático:**
  - `ContentGeneratorService`: Claude (tool-use) gera conteúdo estruturado da landing page (SEO, hero, sobre, serviços, CTA) — nunca código bruto.
  - `renderSiteFiles`: função pura que monta o file set (`package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`) a partir da empresa + conteúdo gerado, embutindo todo texto via `JSON.stringify` — garante TSX sintaticamente válido mesmo com conteúdo adversarial da IA (testado com aspas, backticks, `</div>`, `{malicious}`).
  - `GitHubDeployService`: commit atômico (Git Data API — ref, commit base, tree, novo commit, atualização de branch) no monorepo dedicado de sites, uma pasta por lead (`sites/<slug>`).
  - `VercelDeployService`: deploy via Deployments API da Vercel com os arquivos embutidos na requisição, sem depender de integração Git pré-configurada.
  - `WebsiteGenerationProcessor` (fila BullMQ) orquestra os quatro passos e grava `Lead.previewUrl`. Disparo é explícito por empresa (`POST /companies/:id/generate-website`), não automático para toda empresa com alta oportunidade.
  - ADR 0010 registra as decisões (discutidas com o usuário antes de implementar): geração via API estruturada em vez de sessão completa do Claude Agent SDK; monorepo com uma pasta por lead; deploy Vercel direto por arquivo em vez de integração Git; trigger manual por empresa.
  - 23 novos testes unitários (79/79 no total em `apps/api`). Não testado com `GITHUB_TOKEN`/`VERCEL_TOKEN` reais nem contra um `GENERATED_SITES_REPO` real — pendência registrada em `TODO.md`.
- **Fase 5 — Fila de Aprovação Manual:**
  - Migration `20260712004025_add_lead_notes` (campo `Lead.notes`), gerada offline via diff entre os dois schemas (não precisou de banco).
  - `ApproachMessageService` (Agent 8): Claude (tool-use) escreve a mensagem de abordagem personalizada, rodando dentro do mesmo job do `WebsiteGenerationProcessor` — logo após o deploy, quando já existem `previewUrl` e os achados do `WebsiteAudit`.
  - `LeadsModule`: `GET /leads` (ordenado por Opportunity Score da empresa), `GET /leads/:id`, `PATCH /leads/:id` (edita mensagem/notas), `POST /leads/:id/send` (grava `approvedBy`/`approvedAt`/`status`/`sentAt` — gate de aprovação humana; não dispara nenhum envio real ainda, isso é a Fase 6).
  - `apps/web`: `/leads` (lista) e `/leads/[id]` (análise do site antigo vs. preview novo, mensagem e notas editáveis, botão Enviar).
  - ADR 0011 registra o escopo do "Enviar" nesta fase e a decisão de gerar a mensagem automaticamente, não via trigger separado.
  - 17 novos testes unitários (88/88 no total em `apps/api`).
- **Fase 6 — WhatsApp:**
  - `WhatsappService`: envia a mensagem inicial via WhatsApp Business Cloud API (Meta), sempre como template pré-aprovado (`WHATSAPP_TEMPLATE_NAME`/`WHATSAPP_TEMPLATE_LANGUAGE`, default `abordagem_lead`/`pt_BR`) — exigência da própria Cloud API para contatos iniciados pela empresa, fora de qualquer janela de conversa.
  - `buildWhatsappManualLink`: fallback de abertura de conversa manual (`wa.me/<telefone>?text=<mensagem>`) usado quando não há WhatsApp cadastrado, as credenciais não estão configuradas, ou a chamada à Cloud API falha.
  - Novo model `ContactAttempt` (migration `20260712030000_add_contact_attempts`): histórico de contato — uma linha por tentativa, com canal, status e erro, usado tanto para auditoria quanto para evitar duplicidade.
  - `LeadsService.send()` passa a ser o disparo real (reaproveitando `POST /leads/:id/send`, conforme já previsto na ADR 0011): recusa reenvio de um lead que já saiu de `not_sent` (`ConflictException`), tenta a Cloud API e cai automaticamente no fallback manual em caso de falha ou ausência de credenciais.
  - `apps/web`: tela do lead mostra se o envio foi via API oficial ou se precisa de abertura manual (com o link `wa.me` pronto).
  - ADR 0012 registra as decisões técnicas: Cloud API direta sem BSP, template único com variável de corpo, fallback manual sempre disponível, histórico via `ContactAttempt`.
  - 12 novos testes unitários (100/100 no total em `apps/api`) cobrindo `WhatsappService`, `buildWhatsappManualLink` e os caminhos de `LeadsService.send()` (API ok, API indisponível, API falha com fallback, sem telefone, reenvio recusado). Não testado com credenciais reais nem com um template de fato aprovado no Meta Business Manager — pendência registrada em `TODO.md`.
- **Fase 7 — CRM + Dashboard:**
  - Novo model `LeadStatusEvent` (migration `20260712043000_add_crm_funnel_and_follow_up`): histórico de toda transição de status do funil, inclusive `not_sent → sent` gravada pelo próprio gate de envio — é o que torna métricas por período possíveis ("respostas hoje").
  - `PATCH /leads/:id/status`: atualização manual de estágio pelo operador (visualizou/respondeu/interessado/reunião/cliente/perdido), com validação: lead em `not_sent` não pode ser movido manualmente e ninguém re-seta `not_sent`/`sent` (estados geridos pelo sistema). Entre estágios pós-envio o movimento é livre, inclusive para trás (ADR 0013).
  - Follow-up: campos `Lead.nextActionAt`/`nextActionNote` editáveis via `PATCH /leads/:id`; modelo *pull* — o dashboard lista os vencidos, sem notificação push no MVP.
  - `DashboardModule`: `GET /dashboard/metrics?from=&to=` (default: dia corrente UTC) — empresas encontradas, oportunidades identificadas (`finalScore >= 50`), previews criados, mensagens enviadas, respostas/reuniões/vendas (via eventos), snapshot do funil por status e follow-ups vencidos.
  - `apps/web`: a home vira o dashboard real (KPIs, funil em barras, follow-ups vencidos com link para o lead); tela do lead ganha seletor de status do funil e campos de follow-up.
  - ADR 0013 registra as decisões (tabela de eventos, regras de transição, follow-up pull, corte de oportunidade).
  - 8 novos testes unitários (108/108 no total em `apps/api`).
