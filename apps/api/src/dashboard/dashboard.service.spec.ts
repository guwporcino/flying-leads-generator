import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    company: { count: jest.Mock };
    opportunityScore: { count: jest.Mock };
    lead: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    leadStatusEvent: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      company: { count: jest.fn().mockResolvedValue(12) },
      opportunityScore: { count: jest.fn().mockResolvedValue(7) },
      lead: {
        // 1ª chamada: previews criados; 2ª: mensagens enviadas
        count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(3),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'not_sent', _count: { _all: 2 } },
          { status: 'sent', _count: { _all: 3 } },
          { status: 'customer', _count: { _all: 1 } },
        ]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      leadStatusEvent: {
        groupBy: jest.fn().mockResolvedValue([
          { toStatus: 'replied', _count: { _all: 4 } },
          { toStatus: 'customer', _count: { _all: 1 } },
        ]),
      },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('aggregates period metrics, funnel snapshot and follow-ups', async () => {
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        status: 'interested',
        nextActionAt: new Date('2026-07-10T12:00:00Z'),
        nextActionNote: 'ligar de volta',
        company: { name: 'Padaria Central' },
      },
    ]);

    const metrics = await service.getMetrics({});

    expect(metrics.companiesFound).toBe(12);
    expect(metrics.opportunitiesIdentified).toBe(7);
    expect(metrics.previewsCreated).toBe(5);
    expect(metrics.messagesSent).toBe(3);
    expect(metrics.replies).toBe(4);
    expect(metrics.meetings).toBe(0);
    expect(metrics.sales).toBe(1);
    expect(metrics.funnel).toEqual({
      not_sent: 2,
      sent: 3,
      viewed: 0,
      replied: 0,
      interested: 0,
      meeting: 0,
      customer: 1,
      lost: 0,
    });
    expect(metrics.overdueFollowUps).toEqual([
      {
        leadId: 'lead-1',
        companyName: 'Padaria Central',
        status: 'interested',
        nextActionAt: '2026-07-10T12:00:00.000Z',
        nextActionNote: 'ligar de volta',
      },
    ]);
  });

  it('defaults the period to the current UTC day', async () => {
    const metrics = await service.getMetrics({});

    expect(metrics.period.from.endsWith('T00:00:00.000Z')).toBe(true);
    expect(new Date(metrics.period.to).getTime()).toBeGreaterThanOrEqual(
      new Date(metrics.period.from).getTime(),
    );

    const companyCall = prisma.company.count.mock.calls[0] as unknown as [
      { where: { createdAt: { gte: Date; lte: Date } } },
    ];
    expect(companyCall[0].where.createdAt.gte.toISOString()).toBe(metrics.period.from);
  });

  it('uses the provided from/to range and applies the opportunity threshold', async () => {
    const metrics = await service.getMetrics({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.000Z',
    });

    expect(metrics.period).toEqual({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.000Z',
    });

    const scoreCall = prisma.opportunityScore.count.mock.calls[0] as unknown as [
      { where: { finalScore: { gte: number } } },
    ];
    expect(scoreCall[0].where.finalScore.gte).toBe(50);
  });

  it('only counts replied/meeting/customer events and excludes closed leads from follow-ups', async () => {
    await service.getMetrics({});

    const eventCall = prisma.leadStatusEvent.groupBy.mock.calls[0] as unknown as [
      { where: { toStatus: { in: string[] } } },
    ];
    expect(eventCall[0].where.toStatus.in).toEqual(['replied', 'meeting', 'customer']);

    const followUpCall = prisma.lead.findMany.mock.calls[0] as unknown as [
      { where: { status: { notIn: string[] } } },
    ];
    expect(followUpCall[0].where.status.notIn).toEqual(['customer', 'lost']);
  });
});
