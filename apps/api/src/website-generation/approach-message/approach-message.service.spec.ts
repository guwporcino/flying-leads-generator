import { ConfigService } from '@nestjs/config';
import { ApproachMessageService } from './approach-message.service';
import { ApproachMessageInput } from './approach-message.types';

const createMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }));
});

function buildInput(overrides: Partial<ApproachMessageInput> = {}): ApproachMessageInput {
  return {
    companyName: 'Clínica Sorriso',
    category: 'dentist',
    hasWebsite: false,
    websiteGrade: null,
    previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
    ...overrides,
  };
}

function configWithKey(apiKey: string | undefined): ConfigService {
  return { get: jest.fn(() => apiKey) } as unknown as ConfigService;
}

describe('ApproachMessageService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('returns the message from the tool_use block', async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'submit_approach_message',
          input: {
            message:
              'Oi! Vi que a Clínica Sorriso ainda não tem site — preparamos um de graça: https://clinica-sorriso-abc123.vercel.app. Bora conversar?',
          },
        },
      ],
    });

    const service = new ApproachMessageService(configWithKey('test-key'));
    const result = await service.generate(buildInput());

    expect(result).toContain('clinica-sorriso-abc123.vercel.app');
  });

  it('throws when Claude does not return a tool_use block', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] });

    const service = new ApproachMessageService(configWithKey('test-key'));

    await expect(service.generate(buildInput())).rejects.toThrow('tool_use');
  });

  it('throws when ANTHROPIC_API_KEY is not configured', async () => {
    const service = new ApproachMessageService(configWithKey(undefined));

    await expect(service.generate(buildInput())).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
