# TODO — backlog acionável

Escopo: Fase 0 do [`ROADMAP.md`](./ROADMAP.md) (Fundação do projeto). Itens de fases futuras não devem ser iniciados antes de fechar esta lista.

- [ ] Registrar ADR de escolha de gerenciador de monorepo (pnpm workspaces + Turborepo é o candidato default — confirmar antes de implementar)
- [ ] Criar `apps/web` (Next.js + Tailwind + shadcn/ui) — shell vazio, sem features
- [ ] Criar `apps/api` (NestJS) — shell vazio, health check apenas
- [ ] Criar `packages/shared-types` com os contratos `Company`, `WebsiteAudit`, `OpportunityScore`, `Lead` descritos em `ARCHITECTURE.md`
- [ ] Configurar ESLint + Prettier + TypeScript strict em todo o monorepo
- [ ] Configurar GitHub Actions: lint, typecheck, build em cada PR
- [ ] Definir migrations iniciais (PostgreSQL) para `Campaign`, `Company`, `WebsiteAudit`, `Lead`
- [ ] Criar `.env.example` documentando todas as variáveis necessárias (Google Places API key, Anthropic API key, Vercel token, WhatsApp Business API, Supabase, banco de dados) — sem valores reais
- [ ] Atualizar `CHANGELOG.md` ao final da Fase 0

Não iniciar Fase 1 (Google Maps Search Engine) antes de fechar os itens acima.
