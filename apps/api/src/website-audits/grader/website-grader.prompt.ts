import type Anthropic from '@anthropic-ai/sdk';

export const WEBSITE_GRADER_TOOL_NAME = 'submit_website_grade';

/**
 * Prompt do sistema para a IA avaliadora (módulo 2.3, ARCHITECTURE.md §2.3).
 * Mantido em sincronia manual com docs/prompts/website-grader.md — qualquer
 * mudança aqui deve ser refletida lá (ver ADR 0008).
 */
export const GRADER_SYSTEM_PROMPT = `Você é um avaliador especialista em UI, UX e performance de websites de pequenas e médias empresas locais.

Avalie o website descrito pelo usuário usando estritamente estes critérios, cada um de 0 a 10:
- ui: qualidade visual (tipografia, cores, espaçamento, consistência)
- ux: clareza de navegação e fluxo de informação
- responsiveness: adequação a dispositivos móveis
- performance: velocidade de carregamento percebida
- seo: presença de título, meta descrição e boas práticas básicas de SEO
- design: modernidade e qualidade estética geral
- credibility: sinais de confiança (contato, redes sociais, informações claras)
- modernity: quão atual o site parece (tecnologia, tendências de design)
- clarity: clareza da proposta de valor do negócio
- cta: presença e eficácia de calls-to-action
- conversion: probabilidade de converter um visitante em contato/cliente

Depois:
- Classifique o site em uma destas cinco categorias: "Excelente", "Bom", "Regular", "Ruim", "Péssimo".
- Liste os problemas mais relevantes encontrados, cada um associado ao critério correspondente, com uma explicação objetiva.
- Atribua um Opportunity Score de 0 a 100: quanto pior o site, mais alto o score (100 = máxima oportunidade comercial de venda de um novo site; 0 = site já excelente, sem oportunidade).

Responda exclusivamente chamando a tool ${WEBSITE_GRADER_TOOL_NAME} — nunca em texto livre.`;

export const GRADER_TOOL: Anthropic.Tool = {
  name: WEBSITE_GRADER_TOOL_NAME,
  description:
    'Registra a avaliação estruturada de um website: notas por critério, classificação geral, problemas encontrados e Opportunity Score.',
  input_schema: {
    type: 'object',
    properties: {
      criteria: {
        type: 'object',
        description: 'Notas de 0 a 10 para cada critério de avaliação.',
        properties: {
          ui: { type: 'number', minimum: 0, maximum: 10 },
          ux: { type: 'number', minimum: 0, maximum: 10 },
          responsiveness: { type: 'number', minimum: 0, maximum: 10 },
          performance: { type: 'number', minimum: 0, maximum: 10 },
          seo: { type: 'number', minimum: 0, maximum: 10 },
          design: { type: 'number', minimum: 0, maximum: 10 },
          credibility: { type: 'number', minimum: 0, maximum: 10 },
          modernity: { type: 'number', minimum: 0, maximum: 10 },
          clarity: { type: 'number', minimum: 0, maximum: 10 },
          cta: { type: 'number', minimum: 0, maximum: 10 },
          conversion: { type: 'number', minimum: 0, maximum: 10 },
        },
        required: [
          'ui',
          'ux',
          'responsiveness',
          'performance',
          'seo',
          'design',
          'credibility',
          'modernity',
          'clarity',
          'cta',
          'conversion',
        ],
      },
      grade: {
        type: 'string',
        enum: ['Excelente', 'Bom', 'Regular', 'Ruim', 'Péssimo'],
      },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            criterion: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['criterion', 'explanation'],
        },
      },
      opportunity_score: { type: 'number', minimum: 0, maximum: 100 },
    },
    required: ['criteria', 'grade', 'findings', 'opportunity_score'],
  },
};
