import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ScrapedWebsiteData } from '../scraper/scraper.types';
import { WebsiteGradeResult, WebsiteGradeToolInput } from './website-grader.types';
import {
  GRADER_SYSTEM_PROMPT,
  GRADER_TOOL,
  WEBSITE_GRADER_TOOL_NAME,
} from './website-grader.prompt';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2048;

@Injectable()
export class WebsiteGraderService {
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  async grade(
    companyName: string,
    category: string,
    scraped: ScrapedWebsiteData,
  ): Promise<WebsiteGradeResult> {
    const message = await this.getClient().messages.create({
      model: this.config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: GRADER_SYSTEM_PROMPT,
      tools: [GRADER_TOOL],
      tool_choice: { type: 'tool', name: WEBSITE_GRADER_TOOL_NAME },
      messages: [{ role: 'user', content: buildUserPrompt(companyName, category, scraped) }],
    });

    return toGradeResult(extractToolInput(message));
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

function buildUserPrompt(
  companyName: string,
  category: string,
  scraped: ScrapedWebsiteData,
): string {
  return [
    `Empresa: ${companyName} (${category})`,
    `Título da página: ${scraped.title ?? '(sem título)'}`,
    `Meta descrição: ${scraped.description ?? '(sem descrição)'}`,
    `HTTPS: ${scraped.hasHttps ? 'sim' : 'não'}`,
    `Responsivo (meta viewport): ${scraped.isResponsive ? 'sim' : 'não'}`,
    `Tempo de carregamento: ${scraped.loadTimeMs}ms`,
    `Tecnologia detectada: ${scraped.detectedTechnology.join(', ') || 'não identificada'}`,
    `Ano de copyright: ${scraped.copyrightYear ?? 'não encontrado'}`,
    `Links quebrados na amostra: ${scraped.brokenLinksCount}`,
    `Redes sociais vinculadas: ${scraped.socialLinks.join(', ') || 'nenhuma'}`,
    `Possui formulário de contato: ${scraped.hasContactForm ? 'sim' : 'não'}`,
    `Possui mapa incorporado: ${scraped.hasMap ? 'sim' : 'não'}`,
    `Possui blog: ${scraped.hasBlog ? 'sim' : 'não'}`,
    '',
    'Texto visível da página (trecho):',
    scraped.textExcerpt || '(vazio)',
  ].join('\n');
}

function extractToolInput(message: Anthropic.Message): WebsiteGradeToolInput {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block with the website grade');
  }
  return toolUse.input as WebsiteGradeToolInput;
}

function toGradeResult(input: WebsiteGradeToolInput): WebsiteGradeResult {
  return {
    criteriaScores: input.criteria,
    grade: input.grade,
    findings: input.findings,
    opportunityScore: input.opportunity_score,
  };
}
