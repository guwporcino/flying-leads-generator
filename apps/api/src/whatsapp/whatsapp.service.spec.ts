import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsappSendError } from './whatsapp.error';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function buildConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    WHATSAPP_BUSINESS_API_TOKEN: 'wa-token',
    WHATSAPP_BUSINESS_PHONE_NUMBER_ID: '1234567890',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

describe('WhatsappService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('isConfigured', () => {
    it('is true when both token and phone number id are set', () => {
      expect(new WhatsappService(buildConfig()).isConfigured()).toBe(true);
    });

    it('is false when the token is missing', () => {
      const service = new WhatsappService(buildConfig({ WHATSAPP_BUSINESS_API_TOKEN: undefined }));
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('sendTemplateMessage', () => {
    it('sends a template message and returns the provider message id', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.123' }] }),
      );

      const service = new WhatsappService(buildConfig());
      const result = await service.sendTemplateMessage('+55 11 99999-9999', 'Olá, tudo bem?');

      expect(result).toEqual({ providerMessageId: 'wamid.123' });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
      const body = JSON.parse(init.body as string) as {
        to: string;
        template: { name: string; language: { code: string } };
      };
      expect(body.to).toBe('5511999999999');
      expect(body.template.name).toBe('abordagem_lead');
      expect(body.template.language.code).toBe('pt_BR');
    });

    it('uses the configured template name and language when set', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.123' }] }),
      );

      const service = new WhatsappService(
        buildConfig({
          WHATSAPP_TEMPLATE_NAME: 'custom_template',
          WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
        }),
      );
      await service.sendTemplateMessage('5511999999999', 'Hi!');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as {
        template: { name: string; language: { code: string } };
      };
      expect(body.template.name).toBe('custom_template');
      expect(body.template.language.code).toBe('en_US');
    });

    it('throws WhatsappSendError on a non-ok response', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: { message: 'template not approved' } }, false, 400),
      );

      const service = new WhatsappService(buildConfig());

      await expect(service.sendTemplateMessage('5511999999999', 'oi')).rejects.toThrow(
        WhatsappSendError,
      );
    });

    it('throws WhatsappSendError when credentials are not configured', async () => {
      const service = new WhatsappService(
        buildConfig({ WHATSAPP_BUSINESS_PHONE_NUMBER_ID: undefined }),
      );

      await expect(service.sendTemplateMessage('5511999999999', 'oi')).rejects.toThrow(
        WhatsappSendError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
