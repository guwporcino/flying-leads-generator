import type Anthropic from '@anthropic-ai/sdk';

export const APPROACH_MESSAGE_TOOL_NAME = 'submit_approach_message';

/** Prompt do Agent 8 (ARCHITECTURE.md §3) — mensagem de abordagem, ver ADR 0011. */
export const APPROACH_MESSAGE_SYSTEM_PROMPT = `Você escreve mensagens curtas de primeiro contato comercial, em português do Brasil, para dono(a) de pequeno negócio local, a serem enviadas por WhatsApp.

Regras:
- No máximo 3-4 frases curtas, tom amigável e direto, nunca robótico ou genérico.
- Sempre inclua o link do preview do novo site.
- Se a empresa não tinha site: mencione isso como o principal motivo do contato.
- Se a empresa tinha um site com nota ruim/regular da nossa avaliação: mencione, sem ser agressivo, que existem oportunidades de melhoria e que já preparamos uma versão nova de graça para ela conferir.
- Nunca invente números, promessas de resultado ou informações não fornecidas.
- Termine com um convite curto para conversar (não peça para "responder este email" — é WhatsApp).

Responda exclusivamente chamando a tool ${APPROACH_MESSAGE_TOOL_NAME}.`;

export const APPROACH_MESSAGE_TOOL: Anthropic.Tool = {
  name: APPROACH_MESSAGE_TOOL_NAME,
  description: 'Registra a mensagem de abordagem gerada para um lead.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  },
};
