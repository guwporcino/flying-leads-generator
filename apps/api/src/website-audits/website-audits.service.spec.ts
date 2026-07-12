import { Queue } from 'bullmq';
import { Company } from '@prisma/client';
import { WebsiteAuditsService } from './website-audits.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpportunityScoreService } from '../opportunity-score/opportunity-score.service';
import { WebsiteAuditJobData } from './website-audits.types';

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-1',
    campaignId: 'campaign-1',
    name: 'Clínica Sorriso',
    phone: null,
    whatsapp: null,
    website: null,
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

describe('WebsiteAuditsService', () => {
  let service: WebsiteAuditsService;
  let queue: { add: jest.Mock };
  let prisma: { websiteAudit: { upsert: jest.Mock } };
  let opportunityScore: { recordNoWebsiteOpportunity: jest.Mock };

  beforeEach(() => {
    queue = { add: jest.fn() };
    prisma = { websiteAudit: { upsert: jest.fn() } };
    opportunityScore = { recordNoWebsiteOpportunity: jest.fn() };
    service = new WebsiteAuditsService(
      queue as unknown as Queue<WebsiteAuditJobData>,
      prisma as unknown as PrismaService,
      opportunityScore as unknown as OpportunityScoreService,
    );
  });

  it('enqueues a job for companies with a website', async () => {
    await service.processCompany(buildCompany({ website: 'https://clinicasorriso.example' }));

    expect(queue.add).toHaveBeenCalledWith('audit', { companyId: 'company-1' });
    expect(prisma.websiteAudit.upsert).not.toHaveBeenCalled();
  });

  it('marks companies without a website as an opportunity, without enqueueing', async () => {
    await service.processCompany(buildCompany({ website: null }));

    expect(queue.add).not.toHaveBeenCalled();

    const calls = prisma.websiteAudit.upsert.mock.calls as unknown as [
      { where: { companyId: string }; create: { hasWebsite: boolean } },
    ][];
    const upsertArgs = calls[0]![0];
    expect(upsertArgs.where).toEqual({ companyId: 'company-1' });
    expect(upsertArgs.create.hasWebsite).toBe(false);
    expect(opportunityScore.recordNoWebsiteOpportunity).toHaveBeenCalledWith('company-1');
  });
});
