import { OpportunityScoreService } from './opportunity-score.service';
import { PrismaService } from '../prisma/prisma.service';
import { RuleScoreInput } from './opportunity-score.types';

describe('OpportunityScoreService', () => {
  let service: OpportunityScoreService;
  let prisma: { opportunityScore: { upsert: jest.Mock } };

  beforeEach(() => {
    prisma = { opportunityScore: { upsert: jest.fn() } };
    service = new OpportunityScoreService(prisma as unknown as PrismaService);
  });

  it('records a 100 score with no aiScore for companies without a website', async () => {
    await service.recordNoWebsiteOpportunity('company-1');

    expect(prisma.opportunityScore.upsert).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      create: {
        companyId: 'company-1',
        ruleBasedScore: 100,
        aiScore: null,
        finalScore: 100,
        reason: 'Sem site',
      },
      update: {
        ruleBasedScore: 100,
        aiScore: null,
        finalScore: 100,
        reason: 'Sem site',
      },
    });
  });

  it('combines the rule-based score with the AI score for audited companies', async () => {
    const signals: RuleScoreInput = {
      hasWebsite: true,
      copyrightYear: 2010,
      performanceScore: 90,
      seoScore: 90,
      hasHttps: true,
    };

    await service.recordFromAudit('company-1', signals, 70);

    const calls = prisma.opportunityScore.upsert.mock.calls as unknown as [
      {
        where: { companyId: string };
        create: { companyId: string; ruleBasedScore: number; aiScore: number; finalScore: number };
      },
    ][];
    const upsertArgs = calls[0]![0];

    expect(upsertArgs.where).toEqual({ companyId: 'company-1' });
    expect(upsertArgs.create).toMatchObject({
      companyId: 'company-1',
      ruleBasedScore: 90,
      aiScore: 70,
      finalScore: 80,
    });
  });
});
