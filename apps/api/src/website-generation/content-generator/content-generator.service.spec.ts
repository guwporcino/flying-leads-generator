import { ConfigService } from '@nestjs/config';
import { CompanySiteInput } from '../website-generation.types';
import { ContentGeneratorService } from './content-generator.service';

const createMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }));
});

function buildCompany(overrides: Partial<CompanySiteInput> = {}): CompanySiteInput {
  return {
    id: 'company-1',
    name: 'Clínica Sorriso',
    category: 'dentist',
    phone: '(31) 3333-4444',
    whatsapp: null,
    rating: 4.5,
    reviewCount: 20,
    googleMapsUrl: 'https://maps.google.com/?cid=1',
    ...overrides,
  };
}

function configWithKey(apiKey: string | undefined): ConfigService {
  return { get: jest.fn(() => apiKey) } as unknown as ConfigService;
}

describe('ContentGeneratorService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('parses the tool_use block into GeneratedSiteContent', async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'submit_site_content',
          input: {
            seoTitle: 'Clínica Sorriso — Dentista em BH',
            seoDescription: 'Odontologia geral e estética em Belo Horizonte.',
            heroHeadline: 'Seu sorriso, nossa prioridade',
            heroSubheadline: 'Atendimento odontológico completo para toda a família.',
            aboutText: 'A Clínica Sorriso é referência em odontologia na região.',
            services: ['Limpeza', 'Clareamento', 'Ortodontia'],
            ctaText: 'Fale agora pelo WhatsApp',
          },
        },
      ],
    });

    const service = new ContentGeneratorService(configWithKey('test-key'));
    const result = await service.generate(buildCompany());

    expect(result.seoTitle).toBe('Clínica Sorriso — Dentista em BH');
    expect(result.services).toHaveLength(3);
  });

  it('throws when Claude does not return a tool_use block', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] });

    const service = new ContentGeneratorService(configWithKey('test-key'));

    await expect(service.generate(buildCompany())).rejects.toThrow('tool_use');
  });

  it('throws when ANTHROPIC_API_KEY is not configured', async () => {
    const service = new ContentGeneratorService(configWithKey(undefined));

    await expect(service.generate(buildCompany())).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
