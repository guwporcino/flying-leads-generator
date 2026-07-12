import { ConfigService } from '@nestjs/config';
import { ScrapedWebsiteData } from '../scraper/scraper.types';
import { WebsiteGraderService } from './website-grader.service';

const createMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }));
});

function buildScraped(overrides: Partial<ScrapedWebsiteData> = {}): ScrapedWebsiteData {
  return {
    title: 'Clínica Sorriso',
    description: 'Odontologia geral',
    detectedTechnology: ['WordPress'],
    pageCount: 3,
    loadTimeMs: 1200,
    hasHttps: true,
    isResponsive: false,
    brokenLinksCount: 1,
    lastUpdatedDetectedAt: null,
    copyrightYear: 2015,
    socialLinks: [],
    hasContactForm: true,
    hasMap: false,
    hasBlog: false,
    textExcerpt: 'texto de exemplo',
    ...overrides,
  };
}

function configWithKey(apiKey: string | undefined): ConfigService {
  return { get: jest.fn(() => apiKey) } as unknown as ConfigService;
}

describe('WebsiteGraderService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('parses the tool_use block into a WebsiteGradeResult', async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'submit_website_grade',
          input: {
            criteria: {
              ui: 4,
              ux: 3,
              responsiveness: 2,
              performance: 5,
              seo: 3,
              design: 4,
              credibility: 5,
              modernity: 3,
              clarity: 4,
              cta: 2,
              conversion: 3,
            },
            grade: 'Regular',
            findings: [{ criterion: 'responsiveness', explanation: 'Sem meta viewport.' }],
            opportunity_score: 74,
          },
        },
      ],
    });

    const service = new WebsiteGraderService(configWithKey('test-key'));
    const result = await service.grade('Clínica Sorriso', 'dentist', buildScraped());

    expect(result.grade).toBe('Regular');
    expect(result.opportunityScore).toBe(74);
    expect(result.criteriaScores.ui).toBe(4);
    expect(result.findings).toHaveLength(1);
  });

  it('throws when Claude does not return a tool_use block', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] });

    const service = new WebsiteGraderService(configWithKey('test-key'));

    await expect(service.grade('Clínica Sorriso', 'dentist', buildScraped())).rejects.toThrow(
      'tool_use',
    );
  });

  it('throws when ANTHROPIC_API_KEY is not configured', async () => {
    const service = new WebsiteGraderService(configWithKey(undefined));

    await expect(service.grade('Clínica Sorriso', 'dentist', buildScraped())).rejects.toThrow(
      'ANTHROPIC_API_KEY',
    );
  });
});
