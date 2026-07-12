# 12. Integração técnica com a WhatsApp Business Cloud API (Fase 6)

## Status

Aceito

## Contexto

ADR 0003 já decidiu o princípio: apenas API oficial do WhatsApp Business, com aprovação humana obrigatória e histórico de contato para evitar duplicidade. ARCHITECTURE.md §2.8 detalha o fluxo esperado: mensagem gerada automaticamente (já resolvido na Fase 5, ADR 0011), envio via API oficial **ou** abertura de conversa manual quando a API não se aplicar, confirmação humana antes de cada envio (`POST /leads/:id/send`, já existente), e histórico de contatos.

Falta decidir os detalhes técnicos de implementação: qual API oficial concreta, como lidar com a exigência de templates pré-aprovados para mensagens iniciadas pela empresa, como funciona o fallback manual, e como fica o registro de histórico.

## Decisão

### 1. Meta WhatsApp Cloud API diretamente, sem BSP intermediário

Usamos a [Cloud API da Meta](https://developers.facebook.com/docs/whatsapp/cloud-api) via `graph.facebook.com`, autenticada por `WHATSAPP_BUSINESS_API_TOKEN` + `WHATSAPP_BUSINESS_PHONE_NUMBER_ID` (já previstos em `.env.example` desde a Fase 0). Não introduzimos um BSP (Business Solution Provider) terceiro — reduz uma dependência externa e um contrato comercial adicional sem necessidade no estágio atual do produto.

### 2. Mensagem inicial é sempre um template pré-aprovado (não free-form)

Todo lead deste produto é um contato **iniciado pela empresa** (business-initiated), fora de qualquer janela de conversa de 24h — não existe uma mensagem anterior do lead. A Cloud API exige que a primeira mensagem de uma conversa business-initiated use um **Message Template** aprovado previamente no Meta Business Manager; mensagens de texto livre (`type: text`) só são permitidas dentro de uma janela de 24h após o lead responder.

Adotamos um único template, com nome/idioma configuráveis via env (`WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, default `pt_BR`), com um corpo com uma variável `{{1}}` que recebe o texto de `Lead.approachMessage` (já gerado pela IA e editável pelo operador na Fila de Aprovação, ADR 0011). O cadastro e aprovação desse template junto à Meta é um passo manual fora deste repositório — registrado em `TODO.md` como pendência de infraestrutura real, no mesmo padrão das pendências de billing do Google Cloud e dos tokens do GitHub/Vercel.

### 3. `POST /leads/:id/send` continua sendo o único ponto de disparo

Conforme ADR 0011 já previa, não criamos endpoint novo. `LeadsService.send()` passa a, depois de validar a aprovação:

1. Recusar reenvio se o lead não estiver mais em `not_sent` (`ConflictException`) — é a principal defesa contra duplicidade, complementar ao histórico.
2. Se `company.whatsapp` existir **e** as credenciais da Cloud API estiverem configuradas: chamar `WhatsappService.sendTemplateMessage()`. Sucesso grava um `ContactAttempt` (`channel: whatsapp_api`, `status: sent`, `providerMessageId`). Falha (erro de API, template rejeitado, número inválido etc.) grava `ContactAttempt` com `status: failed` e cai no fallback abaixo em vez de deixar o operador sem alternativa.
3. Caso contrário (sem WhatsApp cadastrado, credenciais ausentes, ou falha acima): gera um link `wa.me/<telefone>?text=<mensagem>` (`buildWhatsappManualLink`) e grava `ContactAttempt` (`channel: manual_link`, `status: sent`) — "sent" aqui significa "conversa preparada e disponibilizada ao operador", não que o sistema enviou por fora da API oficial; o clique final é humano, dentro do próprio WhatsApp do operador. Isso é exatamente o "abertura de conversa para envio manual" do ARCHITECTURE.md §2.8.
4. Em ambos os casos, grava `approvedBy`/`approvedAt`/`sentAt` e muda `status` para `sent`, como já acontecia na Fase 5.

O corpo de resposta do endpoint passa a incluir o `ContactAttempt` mais recente (`lastContactAttempt`), para a UI decidir se mostra confirmação de envio via API ou o botão "Abrir WhatsApp".

### 4. Histórico de contato: novo model `ContactAttempt`

Uma tabela dedicada (`contact_attempts`), 1:N a partir de `Lead`, em vez de sobrecarregar os campos já existentes em `Lead` (`sentAt` etc.) — cada tentativa de contato (inclusive falhas) fica registrada, o que é necessário tanto para auditoria (ADR 0003 exige "histórico de contatos") quanto para diagnosticar problemas de template/credenciais sem depender de logs efêmeros.

## Consequências

- Nenhum envio de mensagem de texto livre é feito nesta fase — está fora do escopo por regra da própria Cloud API para o primeiro contato; se o produto evoluir para responder leads dentro da janela de 24h, isso é um ADR novo.
- O template usado em produção precisa existir e estar aprovado no Meta Business Manager antes de qualquer envio real — pendência registrada em `TODO.md`, não bloqueia o desenvolvimento (testado via mocks, seguindo o padrão de todas as fases anteriores).
- `ConflictException` em reenvio é uma mudança de comportamento de `POST /leads/:id/send` em relação à Fase 5 (que sempre aceitava); é intencional e exigida por ADR 0003 ("impedir mensagens duplicadas").
- Falha na Cloud API nunca bloqueia o operador — o fallback manual garante que sempre há um caminho para contatar o lead, honrando "confirmação humana obrigatória" sem exigir que a API oficial esteja sempre disponível/configurada.
