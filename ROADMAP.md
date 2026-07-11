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

- [ ] Job de scraping (fila BullMQ) para empresas com website
- [ ] Extração de performance/SEO/tecnologia (ex.: via Lighthouse programático)
- [ ] Prompt versionado do Website Grader (Claude) com saída JSON estruturada
- [ ] Marcação automática de "sem site" como oportunidade máxima

**Critério de saída:** para uma empresa real, o sistema produz um `WebsiteAudit` completo (ou marca oportunidade, se sem site).

## Fase 3 — Opportunity Score

- [ ] Regras determinísticas de score (sem site, site antigo, site lento, etc.)
- [ ] Combinação com `opportunity_score` da IA avaliadora
- [ ] Ordenação da fila de trabalho por score

**Critério de saída:** lista de empresas de uma campanha ordenada por oportunidade, com score explicável (breakdown visível).

## Fase 4 — Gerador de Website + Deploy automático (módulos 2.5, 2.6)

- [ ] Integração com skill de geração de UI (Claude Code)
- [ ] Pipeline de geração → push para GitHub → deploy Vercel
- [ ] Persistência do link de preview associado ao lead

**Critério de saída:** para um lead com alta oportunidade, o sistema gera um website completo e publica um link de preview funcional, sem intervenção manual.

## Fase 5 — Fila de Aprovação Manual (módulo 2.7)

- [ ] Tela de revisão: análise antiga vs. preview novo vs. mensagem sugerida
- [ ] Edição de mensagem antes do envio
- [ ] Ação explícita "Enviar" (sem envio automático em nenhuma hipótese)

**Critério de saída:** nenhum envio acontece sem clique humano; auditoria registra quem aprovou.

## Fase 6 — WhatsApp (módulo 2.8)

- [ ] Integração com WhatsApp Business API oficial
- [ ] Registro de histórico de contato (evita duplicidade)
- [ ] Fallback documentado para envio manual quando API oficial não se aplica

**Critério de saída:** envio de mensagem real via canal oficial, com log de auditoria e sem uso de automação não oficial.

## Fase 7 — CRM + Dashboard (módulos 2.9, 2.10)

- [ ] Status de funil por lead (`Não enviado → ... → Cliente/Perdido`)
- [ ] Dashboard com métricas do dia/período
- [ ] Follow-up (lembretes, próxima ação)

**Critério de saída:** dashboard reflete em tempo real os números do funil descritos em `README.md`.

## Fase 8 — Hardening para produção

- [ ] Testes automatizados (unit + e2e) cobrindo os módulos 2.1–2.9
- [ ] Autenticação/autorização (Supabase Auth) e multi-tenant se aplicável
- [ ] Observabilidade (logs estruturados, métricas, alertas)
- [ ] Revisão de segurança (secrets, rate limiting, LGPD sobre dados coletados)
- [ ] Auditoria de acessibilidade e performance nos sites gerados

**Critério de saída:** sistema aprovado nos critérios da skill `autonomous-saas-engineer` (Agent 5 — Engineering Auditor) em todas as categorias.

---

Backlog imediato e acionável: ver [`TODO.md`](./TODO.md).
