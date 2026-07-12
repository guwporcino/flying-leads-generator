import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappSendError } from './whatsapp.error';
import {
  WhatsappErrorResponse,
  WhatsappSendMessageResponse,
  WhatsappTemplateMessageResult,
} from './whatsapp.types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Envia a mensagem inicial de contato via WhatsApp Business Cloud API
 * (Meta), sempre como template pré-aprovado — ver ADR 0012. Nunca chamada
 * diretamente por um controller: só `LeadsService.send()` a invoca, depois
 * do gate de aprovação humana (ADR 0011).
 */
@Injectable()
export class WhatsappService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('WHATSAPP_BUSINESS_API_TOKEN') &&
      this.config.get<string>('WHATSAPP_BUSINESS_PHONE_NUMBER_ID'),
    );
  }

  async sendTemplateMessage(to: string, bodyText: string): Promise<WhatsappTemplateMessageResult> {
    const phoneNumberId = this.getRequiredConfig('WHATSAPP_BUSINESS_PHONE_NUMBER_ID');
    const templateName = this.config.get<string>('WHATSAPP_TEMPLATE_NAME') ?? 'abordagem_lead';
    const templateLanguage = this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'pt_BR';

    const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getRequiredConfig('WHATSAPP_BUSINESS_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [{ type: 'body', parameters: [{ type: 'text', text: bodyText }] }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as WhatsappErrorResponse | null;
      throw new WhatsappSendError(
        `WhatsApp Cloud API request failed: ${response.status} ${errorBody?.error?.message ?? 'unknown error'}`,
      );
    }

    const body = (await response.json()) as WhatsappSendMessageResponse;
    const providerMessageId = body.messages[0]?.id;
    if (!providerMessageId) {
      throw new WhatsappSendError('WhatsApp Cloud API response did not include a message id');
    }
    return { providerMessageId };
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new WhatsappSendError(`${key} is not configured`);
    }
    return value;
  }
}
