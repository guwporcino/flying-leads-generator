import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CompanySiteInput, GeneratedSiteContent } from '../website-generation.types';
import {
  CONTENT_GENERATOR_SYSTEM_PROMPT,
  SITE_CONTENT_TOOL,
  SITE_CONTENT_TOOL_NAME,
} from './content-generator.prompt';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;

@Injectable()
export class ContentGeneratorService {
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  async generate(company: CompanySiteInput): Promise<GeneratedSiteContent> {
    const message = await this.getClient().messages.create({
      model: this.config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: CONTENT_GENERATOR_SYSTEM_PROMPT,
      tools: [SITE_CONTENT_TOOL],
      tool_choice: { type: 'tool', name: SITE_CONTENT_TOOL_NAME },
      messages: [{ role: 'user', content: buildUserPrompt(company) }],
    });

    return extractToolInput(message);
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }
}

function buildUserPrompt(company: CompanySiteInput): string {
  return [
    `Empresa: ${company.name}`,
    `Categoria: ${company.category}`,
    `Nota: ${company.rating ?? 'não disponível'}`,
    `Número de avaliações: ${company.reviewCount}`,
  ].join('\n');
}

function extractToolInput(message: Anthropic.Message): GeneratedSiteContent {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block with the site content');
  }
  return toolUse.input as GeneratedSiteContent;
}
