import type { LeadStatus } from './lead.js';

/**
 * Resposta de GET /dashboard/metrics — ver ADR 0013 e ARCHITECTURE.md §2.10.
 * Métricas de período + snapshot do funil + follow-ups vencidos.
 */
export interface DashboardMetrics {
  /** Período efetivamente usado (default: dia corrente, UTC). */
  period: { from: string; to: string };
  /** Contagens dentro do período. */
  companiesFound: number;
  opportunitiesIdentified: number;
  previewsCreated: number;
  messagesSent: number;
  replies: number;
  meetings: number;
  sales: number;
  /** Snapshot atual do funil (independente do período). */
  funnel: Record<LeadStatus, number>;
  /** Leads ativos com nextActionAt vencido. */
  overdueFollowUps: OverdueFollowUp[];
}

export interface OverdueFollowUp {
  leadId: string;
  companyName: string;
  status: LeadStatus;
  nextActionAt: string;
  nextActionNote: string | null;
}
