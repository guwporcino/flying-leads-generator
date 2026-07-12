# 9. Fórmula do Opportunity Score

Data: 2026-07-12

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.4 define a tabela de referência (sem site = 100, site muito antigo = 88–92, site lento = 74, site excelente = 15) e deixa explícito que a fórmula de combinação entre o componente determinístico e o `opportunity_score` da IA avaliadora (§2.3) seria decidida nesta fase.

## Decisão

### Regra determinística (`computeRuleBasedScore`)

Não é aditiva (não soma pontos por problema) — usa o **maior score entre as condições que disparam**, cada uma com um teto fixo, o que mantém o resultado direto de explicar (`reason` lista exatamente qual regra venceu):

| Condição                                            | Score | Reason                                    |
| --------------------------------------------------- | ----- | ----------------------------------------- |
| Sem website                                         | 100   | "Sem site"                                |
| Copyright ≥ 8 anos atrás (site muito desatualizado) | 90    | "Site desatualizado (copyright de {ano})" |
| `performanceScore` heurístico < 50                  | 74    | "Site lento"                              |
| `seoScore` heurístico < 40                          | 60    | "SEO fraco"                               |
| Sem HTTPS                                           | 55    | "Sem HTTPS"                               |
| Nenhuma condição acima                              | 15    | "Site em boas condições"                  |

O baseline de 15 (não zero) reflete que ARCHITECTURE.md já registra 15 como o score de um "site excelente" — sempre existe alguma oportunidade residual, nunca zero.

### Combinação com o score da IA (`combineScores`)

`finalScore = round((ruleBasedScore + aiScore) / 2)`, clampado em 0–100 — média simples, sem peso maior para nenhum dos dois lados. Justificativa: o componente determinístico captura sinais objetivos (idade, performance, HTTPS) que a IA já também "vê" via o texto/dados passados a ela: uma média simples evita dupla contagem do mesmo sinal com pesos arbitrários, e é trivial de explicar/auditar. Pode ser revisto com dados reais de conversão no futuro (nova ADR se mudar).

**Exceção:** quando a empresa não tem website, não há `aiScore` (a IA nunca roda — ver ADR 0008) — `finalScore = ruleBasedScore = 100` diretamente, sem média.

### Onde a computação acontece

Não é um passo isolado — acontece **dentro** do pipeline da Fase 2, imediatamente após o audit, espelhando a sequência Agent 3 → Agent 4 do loop de agentes (ARCHITECTURE.md §3):

- `WebsiteAuditsService.markAsOpportunity` (caminho síncrono, sem site) grava `OpportunityScore` com score 100 no mesmo momento em que grava `WebsiteAudit.hasWebsite = false`.
- `WebsiteAuditProcessor.process` (caminho assíncrono, com site), depois de persistir o `WebsiteAudit`, calcula e persiste o `OpportunityScore` usando os dados recém-coletados e o `opportunity_score` que o `WebsiteGraderService` já retorna (antes descartado — agora persistido).

### Ordenação

`GET /companies?campaignId=` e `GET /campaigns/:id` passam a ordenar por `opportunityScore.finalScore` descendente (nulls por último — empresas ainda na fila aparecem ao final, não pausam a listagem).

## Consequências

- `OpportunityScore.aiScore` fica `null` para empresas sem website — é o esperado, não um bug.
- Como o cálculo é assíncrono (parte do job da fila), o resultado de `POST /campaigns` **não** vem ordenado por oportunidade — só reflete a busca do Google. A ordenação por score só existe nos endpoints de leitura subsequentes (`GET /companies`, `GET /campaigns/:id`), depois que a fila processar.
- Igual às fases anteriores, não testado com Redis/Anthropic reais neste ambiente — mesma limitação registrada em ADR 0006/0007/0008.
