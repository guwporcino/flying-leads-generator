# 11. Mensagem de abordagem e escopo do "Enviar" (Fase 5)

Data: 2026-07-12

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.7 descreve a Fila de Aprovação: o operador vê a análise do site antigo, o preview novo, uma mensagem de abordagem pronta (gerada por IA, editável), telefone/WhatsApp e notas internas, e só então aciona "Enviar". O loop de agentes (§3) coloca "Agent 8 — Escreve abordagem personalizada" logo após "Agent 7 — Publica preview no Vercel", antes da Fila de Aprovação. `ROADMAP.md` Fase 6 é quem integra a API oficial do WhatsApp — nesta fase (5) esse envio real ainda não existe.

## Decisão

### 1. Mensagem de abordagem é gerada automaticamente, dentro do mesmo job da Fase 4

Não é um novo trigger manual. `ApproachMessageService` roda **dentro do `WebsiteGenerationProcessor`**, logo depois do deploy na Vercel — nesse ponto já temos tudo que a mensagem precisa (dados da empresa, achados do `WebsiteAudit`, o `previewUrl` recém-publicado). Isso espelha a sequência Agent 7 → Agent 8 do loop de agentes, do mesmo jeito que a Fase 3 encaixou o cálculo do Opportunity Score dentro do pipeline da Fase 2.

- Mesmo padrão de tool-use das fases anteriores (`ContentGeneratorService`, `WebsiteGraderService`): saída estruturada, não texto livre solto.
- Empresa sem `websiteAudit` completo (ex.: hasWebsite=false) ainda recebe mensagem — o contexto nesse caso é só "sem site", que já é em si o principal argumento de venda.

### 2. `POST /leads/:id/send` é o gate de aprovação, não o envio real

Nesta fase o endpoint:

- exige `approvedBy` (identificador de quem aprovou — texto livre no corpo da requisição; não há sistema de autenticação/usuários ainda, então não existe um "operador logado" para inferir automaticamente),
- grava `approvedAt`, `sentAt` e muda `status` para `sent`,
- **não chama nenhuma API de WhatsApp** — essa integração é o próprio conteúdo da Fase 6.

Nomeamos o endpoint `send` (não `approve`) porque, do ponto de vista do produto, é a ação que o operador reconhece ("clicar Enviar"); o fato de o envio real ainter ser wireado só na Fase 6 é um detalhe de faseamento, não deve mudar o nome da ação nem exigir retrabalho de UI depois.

## Consequências

- Nenhuma mensagem é enviada de fato ainda nesta fase — o critério "nenhum envio acontece sem clique humano" já vale porque **nenhum envio acontece, ponto** (nem manual nem automático) até a Fase 6 existir.
- Quando a Fase 6 for implementada, ela deve reaproveitar `POST /leads/:id/send` como o ponto de disparo real (chamar a WhatsApp Business API dentro do mesmo handler, depois de gravar a aprovação) — não criar um endpoint novo.
- Como não há autenticação, `approvedBy` é um campo de texto confiável apenas pela boa-fé de quem opera o dashboard — isso deve ser revisitado quando o Supabase Auth (ADR 0002) for implementado.
