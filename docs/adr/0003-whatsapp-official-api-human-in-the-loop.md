# 3. WhatsApp: apenas API oficial, com aprovação humana obrigatória

Data: 2026-07-11

## Status

Aceito

## Contexto

O produto depende de contatar leads via WhatsApp. Existem duas famílias de abordagem no mercado: (a) automação não oficial que simula um usuário humano (bibliotecas que controlam o WhatsApp Web/app), com envio em massa; (b) a API oficial do WhatsApp Business, operada pela Meta. A opção (a) tem alto risco de bloqueio de número, viola os Termos de Serviço da plataforma e pode ser usada para spam — inaceitável tanto por risco operacional (contas dos clientes bloqueadas) quanto ético.

## Decisão

- O sistema **não implementa** nenhuma automação que simule ações humanas no WhatsApp nem usa APIs não oficiais para envio em massa.
- A integração de envio é feita exclusivamente via **WhatsApp Business API oficial**. Quando um caso específico não puder usar a API oficial, o sistema prepara a mensagem e o contato, mas o envio é feito manualmente pelo operador (nunca automatizado por fora da API oficial).
- **Toda mensagem passa pela Fila de Aprovação Manual (módulo 2.7)** antes do envio — o sistema nunca envia uma mensagem sem uma ação humana explícita e auditável.
- O histórico de contatos é registrado para impedir mensagens duplicadas/repetidas ao mesmo lead.

## Consequências

- Volume de envio é limitado pelas regras e custos da API oficial (janelas de conversa, templates aprovados) — é uma limitação aceita, não um bug a contornar.
- Reduz drasticamente o risco de bloqueio de conta e de violação de Termos de Serviço.
- Exige, na Fase 6, cadastro e aprovação de templates de mensagem junto à Meta antes de qualquer envio em produção.
- Qualquer proposta futura de "envio automático sem revisão humana" deve ser rejeitada por padrão, salvo novo ADR que reverta esta decisão com justificativa explícita.
