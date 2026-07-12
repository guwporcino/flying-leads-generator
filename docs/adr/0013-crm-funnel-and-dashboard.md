# 13. CRM (funil + histórico de status) e Dashboard (Fase 7)

Data: 2026-07-12

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.9 define o funil de CRM (`Não enviado → Enviado → Visualizou → Respondeu → Interessado → Reunião → Cliente`, com `Perdido` como saída lateral) e §2.10 pede um dashboard de métricas agregadas **por período** ("hoje"): empresas encontradas, oportunidades identificadas, previews criados, mensagens enviadas, respostas, reuniões, vendas.

O enum `LeadStatus` já existe desde a Fase 0, mas até aqui só duas transições acontecem de fato (`not_sent → sent`, via gate de aprovação — ADRs 0011/0012). Não há como o operador registrar os estágios seguintes, e não há timestamps por estágio — sem isso, "respostas hoje" é impossível de calcular (só saberíamos o status *atual* de cada lead, não *quando* mudou).

## Decisão

### 1. Histórico de transições: model `LeadStatusEvent`

Uma tabela de eventos (`lead_status_events`), 1:N a partir de `Lead`: `fromStatus`, `toStatus`, `changedBy`, `createdAt`. Gravada em **toda** mudança de status:

- pelo próprio `LeadsService.send()` (`not_sent → sent`, com `changedBy = approvedBy`);
- pelo novo endpoint de atualização manual de status (abaixo).

É o que torna as métricas por período possíveis ("respostas hoje" = eventos `toStatus: replied` no período) e dá trilha de auditoria do funil — mesmo espírito do `ContactAttempt` da Fase 6.

### 2. Atualização manual de status: `PATCH /leads/:id/status`

Os estágios pós-envio (visualizou, respondeu, interessado, reunião, cliente, perdido) são registrados **manualmente pelo operador** — não existe (ainda) webhook de leitura/resposta do WhatsApp; se um dia existir, ele usará o mesmo caminho de gravação de eventos. Regras de validação, deliberadamente permissivas dentro do pós-envio:

- Lead em `not_sent` não pode ser movido manualmente — a única saída de `not_sent` é o gate de aprovação (`POST /leads/:id/send`), preservando ADR 0011/0012.
- Ninguém pode *voltar* para `not_sent` nem *re-setar* `sent` manualmente — esses dois estados são geridos pelo sistema.
- Entre os demais estágios o operador move livremente (inclusive "para trás", ex.: corrigir um clique errado, ou `lost → interested` se o lead reabrir) — o funil da §2.9 é a ordem *esperada*, não uma máquina de estados rígida; a realidade comercial não é linear e o histórico preserva qualquer zigue-zague.
- `changedBy` é obrigatório no corpo (mesmo racional de `approvedBy` — sem autenticação ainda, ver ADR 0011).

Endpoint separado do `PATCH /leads/:id` (que edita conteúdo: mensagem/notas/follow-up) porque mudar status tem efeito colateral (evento) e validação própria.

### 3. Follow-up: campos no próprio `Lead`

`nextActionAt DateTime?` + `nextActionNote String?` — editáveis via `PATCH /leads/:id`. Sem tabela própria e sem scheduler: o "lembrete" é *pull* (o dashboard lista follow-ups vencidos — `nextActionAt <= agora` em leads ainda ativos), não *push* (e-mail/notificação), que exigiria infra de notificação fora do escopo do MVP. Um follow-up por lead basta: o operador registra a *próxima* ação, não uma agenda completa.

### 4. Dashboard: `GET /dashboard/metrics?from=&to=`

Período default: o dia corrente (UTC). Retorna:

- **Métricas do período** (contagens):
  - `companiesFound` — `Company.createdAt` no período;
  - `opportunitiesIdentified` — `OpportunityScore.computedAt` no período com `finalScore >= 50` (corte que separa os sites saudáveis, score 15, de todas as faixas de problema da ADR 0009: 55/60/74/90/100);
  - `previewsCreated` — `Lead.createdAt` no período (o `Lead` nasce quando o pipeline da Fase 4 publica o preview);
  - `messagesSent` — `Lead.sentAt` no período;
  - `replies` / `meetings` / `sales` — `LeadStatusEvent.toStatus` ∈ {`replied`, `meeting`, `customer`} no período.
- **Snapshot do funil** (independente de período): contagem de leads por status atual.
- **Follow-ups vencidos**: leads com `nextActionAt <= agora` e status fora de {`customer`, `lost`}.

Agregação feita com `count`/`groupBy` do Prisma em uma query por métrica — volumes deste produto (centenas/milhares de leads) não justificam tabela de agregados pré-computados.

## Consequências

- Migration nova (`lead_status_events` + 2 colunas em `leads`); leads pré-Fase 7 não têm eventos retroativos — métricas de período só enxergam mudanças a partir do deploy desta fase (o snapshot do funil não sofre disso).
- `LeadsService.send()` passa a gravar um evento além do que já fazia — nenhuma mudança de contrato para quem chama.
- "Visualizou" continua manual (sem tracking pixel/webhook); automatizar isso é trabalho futuro que se encaixa no mesmo `LeadStatusEvent` sem mudar o schema.
- O corte `finalScore >= 50` para "oportunidade identificada" fica registrado aqui; se a fórmula da ADR 0009 mudar, revisitar este número.
