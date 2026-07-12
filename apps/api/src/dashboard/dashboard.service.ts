import { Injectable } from '@nestjs/common';
import type { DashboardMetrics, LeadStatus } from '@flying-leads/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardMetricsQueryDto } from './dto/dashboard-metrics-query.dto';

/** Corte de finalScore para "oportunidade identificada" — ver ADR 0013. */
const OPPORTUNITY_SCORE_THRESHOLD = 50;

const ALL_LEAD_STATUSES: LeadStatus[] = [
  'not_sent',
  'sent',
  'viewed',
  'replied',
  'interested',
  'meeting',
  'customer',
  'lost',
];

/**
 * Métricas agregadas do funil (ARCHITECTURE.md §2.10, ADR 0013): contagens
 * por período + snapshot do funil + follow-ups vencidos. Agregação direta no
 * banco (count/groupBy) — sem tabela de agregados pré-computados.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(query: DashboardMetricsQueryDto): Promise<DashboardMetrics> {
    const now = new Date();
    const from = query.from ? new Date(query.from) : startOfUtcDay(now);
    const to = query.to ? new Date(query.to) : now;
    const inPeriod = { gte: from, lte: to };

    const [
      companiesFound,
      opportunitiesIdentified,
      previewsCreated,
      messagesSent,
      statusEventCounts,
      funnelGroups,
      overdueLeads,
    ] = await Promise.all([
      this.prisma.company.count({ where: { createdAt: inPeriod } }),
      this.prisma.opportunityScore.count({
        where: { computedAt: inPeriod, finalScore: { gte: OPPORTUNITY_SCORE_THRESHOLD } },
      }),
      this.prisma.lead.count({ where: { createdAt: inPeriod } }),
      this.prisma.lead.count({ where: { sentAt: inPeriod } }),
      this.prisma.leadStatusEvent.groupBy({
        by: ['toStatus'],
        where: { createdAt: inPeriod, toStatus: { in: ['replied', 'meeting', 'customer'] } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.lead.findMany({
        where: { nextActionAt: { lte: now }, status: { notIn: ['customer', 'lost'] } },
        include: { company: { select: { name: true } } },
        orderBy: { nextActionAt: 'asc' },
      }),
    ]);

    const eventCount = (status: LeadStatus): number =>
      statusEventCounts.find((group) => group.toStatus === status)?._count._all ?? 0;

    const funnel = Object.fromEntries(ALL_LEAD_STATUSES.map((status) => [status, 0])) as Record<
      LeadStatus,
      number
    >;
    for (const group of funnelGroups) {
      funnel[group.status] = group._count._all;
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      companiesFound,
      opportunitiesIdentified,
      previewsCreated,
      messagesSent,
      replies: eventCount('replied'),
      meetings: eventCount('meeting'),
      sales: eventCount('customer'),
      funnel,
      overdueFollowUps: overdueLeads.map((lead) => ({
        leadId: lead.id,
        companyName: lead.company.name,
        status: lead.status,
        // nextActionAt não é null aqui — o where exige nextActionAt <= now
        nextActionAt: lead.nextActionAt!.toISOString(),
        nextActionNote: lead.nextActionNote,
      })),
    };
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
