# 10. Geração de website e deploy automático (Fase 4)

Data: 2026-07-12

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.5/§2.6 descreve "Claude Code invoca uma skill de geração de UI" e "GitHub → Vercel → preview.vercel.app", sem detalhar a implementação. Discutido com o usuário antes de implementar (ver conversa): a alternativa mais fiel — rodar uma sessão completa do Claude Agent SDK escrevendo um projeto Next.js inteiro em disco — foi descartada para o MVP por custo, latência e complexidade de rodar dentro de um job de fila. Optamos por uma chamada única à Messages API com tool-use, no mesmo estilo do `WebsiteGraderService` (ADR 0008).

## Decisão

### 1. Geração de conteúdo, não de código bruto

`ContentGeneratorService` pede à Claude (tool-use, saída estruturada) apenas o **conteúdo**: título/descrição SEO, headline/subheadline do hero, texto "sobre", lista de serviços, texto do CTA. Não pedimos à IA para escrever JSX/TypeScript diretamente — um `renderSitePage` (função pura, testável) monta o `app/page.tsx` real a partir desse conteúdo + dados objetivos da empresa (nome, telefone, WhatsApp, endereço, nota, nº de avaliações). Os demais arquivos do projeto (`package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`) são templates estáticos idênticos para todo lead — não são gerados por IA. Isso elimina a classe de erro "a IA escreveu código que não compila" e mantém o custo/latência baixos (uma chamada curta por lead, não uma sessão de agente).

### 2. Organização dos sites: monorepo dedicado, uma pasta por lead

Decisão do usuário. Repositório configurável via `GENERATED_SITES_REPO` (`owner/repo`) — **não criado neste ambiente** (mesma limitação de credenciais das fases anteriores). Cada lead vira `sites/<slug>/` nesse repositório, onde `slug` é gerado a partir do nome da empresa + um sufixo curto do `companyId` (evita colisão entre empresas de nome igual).

### 3. Deploy: GitHub para histórico, Vercel via API direta de arquivos

- `GitHubDeployService` commita o file set atomicamente via **Git Data API** (ref → commit base → tree com os arquivos → novo commit → atualiza a branch) — um commit só por geração, não um commit por arquivo.
- `VercelDeployService` usa a **Deployments API da Vercel com os arquivos embutidos na requisição** (`POST /v13/deployments`), não a integração Git-based (que exigiria o GitHub App da Vercel já instalado/linkado ao repo — um passo manual fora do nosso controle). Isso diverge um pouco da seta "GitHub → Vercel" do diagrama original: o GitHub recebe o commit para histórico/auditoria, e a Vercel recebe os mesmos arquivos diretamente, em paralelo — não é a Vercel reagindo a um push via webhook.

### 4. Trigger: endpoint explícito por empresa, não automático para todas

`POST /companies/:id/generate-website` — enfileira a geração para **uma** empresa específica. Não geramos site automaticamente para toda empresa assim que o Opportunity Score é calculado: cada geração tem custo real (chamada à IA + commit + deploy), e ARCHITECTURE.md não define um gatilho automático explícito para este passo. Fica como melhoria futura (ex.: gatilho automático para `finalScore` acima de um limiar) se o volume justificar.

## Consequências

- O link de preview (`Lead.previewUrl`) é gravado assim que a Vercel responde — não depende de o GitHub ter processado o push antes.
- Nenhuma etapa foi validada com `GITHUB_TOKEN`/`VERCEL_TOKEN` reais nem contra um `GENERATED_SITES_REPO` real neste ambiente — mesma limitação de rede/credenciais registrada em ADR 0006/0007/0008. A forma exata da resposta da Vercel Deployments API deve ser conferida contra a documentação oficial/uma chamada real antes de considerar este pipeline pronto para produção.
- Se o volume de leads crescer a ponto de a geração de conteúdo em texto simples não bastar (ex.: cliente pedir customização visual maior), a migração para uma sessão completa do Claude Agent SDK é aditiva — troca só o `ContentGeneratorService`/`renderSitePage`, não o contrato de `GitHubDeployService`/`VercelDeployService` (ambos já operam sobre um file set genérico `{path, content}[]`).
