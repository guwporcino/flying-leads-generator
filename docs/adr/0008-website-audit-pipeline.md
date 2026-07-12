# 8. Pipeline de auditoria de website: scraping heurístico, grading via Claude, fila BullMQ

Data: 2026-07-11

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.2/§2.3 e o `ROADMAP.md` (Fase 2) definem o que o Coletor e a IA avaliadora precisam produzir, mas não a implementação concreta. Três decisões técnicas precisavam ser tomadas antes de codificar.

## Decisão

### 1. Scraping (módulo 2.2): heurísticas sobre HTML, sem browser headless

- Fetch simples (`fetch` nativo) + parsing com `cheerio` — sem Playwright/Puppeteer/Lighthouse neste MVP.
- Sinais extraídos por heurística, não por medição real de renderização:
  - **Responsividade:** presença de `<meta name="viewport">`.
  - **Performance/tempo de carregamento:** tempo total do `fetch` da página (TTFB + download), não Core Web Vitals reais (LCP/CLS/INP exigem um browser).
  - **Tecnologia detectada:** fingerprint por padrões conhecidos no HTML (`wp-content` → WordPress, `cdn.shopify.com` → Shopify, `static.wixstatic.com` → Wix, etc.).
  - **Quantidade de páginas:** aproximada pela contagem de links internos únicos encontrados na home (não é um crawl do site inteiro).
  - **Links quebrados:** amostragem — até 25 links da home são checados via `HEAD` (com fallback `GET`) em paralelo; não é uma varredura completa do site.
  - **Última atualização, copyright, redes sociais, formulário de contato, mapa, blog:** heurísticas de regex/seletor sobre o HTML.
- **Por quê não Lighthouse real:** apesar deste ambiente ter Chromium pré-instalado (usado para outros fins, ex. testes), rodar Lighthouse em produção exige um Chrome headless disponível no ambiente de deploy do `apps/api` — decisão de infraestrutura ainda não tomada (Docker é o candidato da ADR 0002, mas o alvo final de deploy do backend não está definido). Acoplar essa dependência pesada agora seria prematuro. Fica registrado como melhoria futura, não como pendência bloqueante.

### 2. Avaliação por IA (módulo 2.3): Claude via tool-use, prompt versionado

- Cliente oficial `@anthropic-ai/sdk`, modelo configurável via `ANTHROPIC_MODEL` (default `claude-sonnet-5`) — configuração, não hardcode.
- Saída estruturada garantida via **tool-use** (Claude chama uma tool `submit_website_grade` com um JSON Schema fixo), não parsing de texto livre — elimina a classe de erro "a IA não devolveu JSON válido".
- O prompt (critérios, instruções, formato de saída) vive versionado em `docs/prompts/website-grader.md`, conforme já previsto em ARCHITECTURE.md §2.3.
- Empresas sem website **não passam pelo grader** — o `WebsiteAudit` é criado com `hasWebsite: false` diretamente, de forma síncrona, sem entrar na fila (não há nada para raspar ou avaliar).

### 3. Orquestração: fila BullMQ (Redis), disparada pelo `CampaignsService`

- `BullModule.forRootAsync` no `AppModule` conecta ao Redis via `REDIS_URL`; a fila `website-audit` vive em `WebsiteAuditsModule`, consumida por um `WebsiteAuditProcessor` (`@Processor`) no mesmo processo do `apps/api` (não um worker separado — decisão revisável se precisarmos escalar scraping independente da API).
- `CampaignsService.create()`, depois de persistir as `Company`, enfileira um job por empresa **com** website e cria o `WebsiteAudit(hasWebsite: false)` **diretamente** (sem fila) para empresas sem website.

## Consequências

- Os números de performance/SEO do MVP são heurísticos, não Core Web Vitals reais — isso deve ficar claro para quem usa o `Opportunity Score` (Fase 3) e ser revisitado se a precisão se mostrar insuficiente.
- Nenhuma etapa deste pipeline foi validada com Redis ou `ANTHROPIC_API_KEY` reais neste ambiente de desenvolvimento (mesma limitação de rede/credenciais do ADR 0006 e do ADR 0007) — coberto por testes unitários com mocks; validação real fica registrada em `TODO.md`.
- Adicionar Lighthouse/CWV reais no futuro é aditivo: troca a implementação interna do `ScraperService`, não o contrato `WebsiteAudit` (`packages/shared-types`), que já reserva os campos.
