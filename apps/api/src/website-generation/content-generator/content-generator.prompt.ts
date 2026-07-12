import type Anthropic from '@anthropic-ai/sdk';

export const SITE_CONTENT_TOOL_NAME = 'submit_site_content';

/** Prompt do sistema do gerador de conteúdo (módulo 2.5, ver ADR 0010). */
export const CONTENT_GENERATOR_SYSTEM_PROMPT = `Você é um redator especialista em landing pages de conversão para pequenos negócios locais brasileiros.

Dado o nome, categoria e sinais públicos (nota, número de avaliações) de uma empresa, escreva o conteúdo de uma landing page enxuta e persuasiva em português do Brasil:

- seoTitle: título de até 60 caracteres, incluindo o nome da empresa e a categoria/cidade se fizer sentido.
- seoDescription: meta descrição de até 155 caracteres, resumindo o valor do negócio.
- heroHeadline: frase de impacto curta (até 8 palavras) para o topo da página.
- heroSubheadline: uma frase complementar explicando o que a empresa oferece.
- aboutText: um parágrafo curto (2-3 frases) sobre a empresa, usando a categoria e os sinais de confiança disponíveis (nota/avaliações), sem inventar fatos específicos que não foram informados.
- services: lista de 3 a 5 serviços/produtos plausíveis para essa categoria de negócio.
- ctaText: texto curto e direto para o botão de contato (ex.: "Fale agora pelo WhatsApp").

Nunca invente números de telefone, endereços ou avaliações — esses dados já existem e serão inseridos separadamente. Responda exclusivamente chamando a tool ${SITE_CONTENT_TOOL_NAME}.`;

export const SITE_CONTENT_TOOL: Anthropic.Tool = {
  name: SITE_CONTENT_TOOL_NAME,
  description: 'Registra o conteúdo textual gerado para a landing page de um lead.',
  input_schema: {
    type: 'object',
    properties: {
      seoTitle: { type: 'string' },
      seoDescription: { type: 'string' },
      heroHeadline: { type: 'string' },
      heroSubheadline: { type: 'string' },
      aboutText: { type: 'string' },
      services: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
      ctaText: { type: 'string' },
    },
    required: [
      'seoTitle',
      'seoDescription',
      'heroHeadline',
      'heroSubheadline',
      'aboutText',
      'services',
      'ctaText',
    ],
  },
};
