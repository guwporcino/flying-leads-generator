import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ApproachMessageInput } from './approach-message.types';
import {
  APPROACH_MESSAGE_SYSTEM_PROMPT,
  APPROACH_MESSAGE_TOOL,
  APPROACH_MESSAGE_TOOL_NAME,
} from './approach-message.prompt';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 512;

@Injectable()
export class ApproachMessageService {
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  async generate(input: ApproachMessageInput): Promise<string> {
    const message = await this.getClient().messages.create({
      model: this.config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: APPROACH_MESSAGE_SYSTEM_PROMPT,
      tools: [APPROACH_MESSAGE_TOOL],
      tool_choice: { type: 'tool', name: APPROACH_MESSAGE_TOOL_NAME },
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    return extractMessage(message);
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

function buildUserPrompt(input: ApproachMessageInput): string {
  return [
    `Empresa: ${input.companyName}`,
    `Categoria: ${input.category}`,
    `Possui site: ${input.hasWebsite ? 'sim' : 'não'}`,
    `Nota do site atual (nossa avaliação): ${input.websiteGrade ?? 'não avaliado (sem site)'}`,
    `Link do preview: ${input.previewUrl}`,
  ].join('\n');
}

function extractMessage(message: Anthropic.Message): string {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block with the approach message');
  }
  const input = toolUse.input as { message: string };
  return input.message;
}
