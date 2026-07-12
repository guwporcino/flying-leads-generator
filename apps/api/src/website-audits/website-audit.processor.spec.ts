import { Job } from 'bullmq';
import { Company } from '@prisma/client';
import { WebsiteAuditProcessor } from './website-audit.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from './scraper/scraper.service';
import { WebsiteGraderService } from './grader/website-grader.service';
import { ScrapedWebsiteData } from './scraper/scraper.types';
import { WebsiteAuditJobData } from './website-audits.types';
import { OpportunityScoreService } from '../opportunity-score/opportunity-score.service';

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-1',
    campaignId: 'campaign-1',
    name: 'Clínica Sorriso',
    phone: null,
    whatsapp: null,
    website: 'https://clinicasorriso.example',
    category: 'dentist',
    openingHours: null,
    reviewCount: 0,
    rating: null,
    photos: [],
    description: null,
    latitude: 0,
    longitude: 0,
    googleMapsUrl: '',
    googlePlaceId: 'places/1',
    createdAt: new Date(),
    ...overrides,
  };
}

function buildScraped(overrides: Partial<ScrapedWebsiteData> = {}): ScrapedWebsiteData {
  return {
    title: 'Clínica Sorriso',
    description: null,
    detectedTechnology: ['WordPress'],
    pageCount: 3,
    loadTimeMs: 900,
    hasHttps: true,
    isResponsive: true,
    brokenLinksCount: 0,
    lastUpdatedDetectedAt: null,
    copyrightYear: 2015,
    socialLinks: [],
    hasContactForm: true,
    hasMap: false,
    hasBlog: false,
    textExcerpt: 'texto',
    ...overrides,
  };
}

describe('WebsiteAuditProcessor', () => {
  let processor: WebsiteAuditProcessor;
  let prisma: {
    company: { findUniqueOrThrow: jest.Mock };
    websiteAudit: { upsert: jest.Mock };
  };
  let scraper: { analyze: jest.Mock };
  let grader: { grade: jest.Mock };
  let opportunityScore: { recordFromAudit: jest.Mock };

  beforeEach(() => {
    prisma = {
      company: { findUniqueOrThrow: jest.fn() },
      websiteAudit: { upsert: jest.fn() },
    };
    scraper = { analyze: jest.fn() };
    grader = { grade: jest.fn() };
    opportunityScore = { recordFromAudit: jest.fn() };
    processor = new WebsiteAuditProcessor(
      prisma as unknown as PrismaService,
      scraper as unknown as ScraperService,
      grader as unknown as WebsiteGraderService,
      opportunityScore as unknown as OpportunityScoreService,
    );
  });

  it('scrapes, grades, and persists a WebsiteAudit for a company with a website', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue(buildCompany());
    scraper.analyze.mockResolvedValue(buildScraped());
    grader.grade.mockResolvedValue({
      criteriaScores: {
        ui: 5,
        ux: 5,
        responsiveness: 5,
        performance: 5,
        seo: 5,
        design: 5,
        credibility: 5,
        modernity: 5,
        clarity: 5,
        cta: 5,
        conversion: 5,
      },
      grade: 'Regular',
      findings: [],
      opportunityScore: 60,
    });

    const job = { data: { companyId: 'company-1' } } as Job<WebsiteAuditJobData>;
    await processor.process(job);

    expect(scraper.analyze).toHaveBeenCalledWith('https://clinicasorriso.example');
    expect(grader.grade).toHaveBeenCalledWith('Clínica Sorriso', 'dentist', expect.any(Object));

    const calls = prisma.websiteAudit.upsert.mock.calls as unknown as [
      {
        where: { companyId: string };
        create: {
          hasWebsite: boolean;
          aiGrade: string;
          performanceScore: number;
          seoScore: number;
        };
      },
    ][];
    const upsertArgs = calls[0]![0];
    expect(upsertArgs.where).toEqual({ companyId: 'company-1' });
    expect(upsertArgs.create.hasWebsite).toBe(true);
    expect(upsertArgs.create.aiGrade).toBe('Regular');
    expect(upsertArgs.create.performanceScore).toBe(100);
    expect(upsertArgs.create.seoScore).toBe(70);

    expect(opportunityScore.recordFromAudit).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ hasWebsite: true, performanceScore: 100, seoScore: 70 }),
      60,
    );
  });

  it('skips companies that no longer have a website', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue(buildCompany({ website: null }));

    const job = { data: { companyId: 'company-1' } } as Job<WebsiteAuditJobData>;
    await processor.process(job);

    expect(scraper.analyze).not.toHaveBeenCalled();
    expect(prisma.websiteAudit.upsert).not.toHaveBeenCalled();
    expect(opportunityScore.recordFromAudit).not.toHaveBeenCalled();
  });
});
