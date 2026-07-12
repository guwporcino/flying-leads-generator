import type { ContactAttempt } from './contact-attempt.js';

/** Funil de CRM, ver ARCHITECTURE.md §2.9 */
export type LeadStatus =
  'not_sent' | 'sent' | 'viewed' | 'replied' | 'interested' | 'meeting' | 'customer' | 'lost';

/**
 * Lead: liga uma Company ao website gerado, ao preview publicado e ao status
 * de abordagem. `approvedBy`/`approvedAt` só são preenchidos após aprovação
 * humana explícita na Fila de Aprovação — ver ADR 0003.
 */
export interface Lead {
  id: string;
  companyId: string;
  opportunityScoreId: string | null;
  previewUrl: string | null;
  approachMessage: string | null;
  notes: string | null;
  status: LeadStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  /** Follow-up — ver ADR 0013. Próxima ação registrada pelo operador. */
  nextActionAt: string | null;
  nextActionNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Presente apenas quando o backend inclui o histórico (ex.: resposta de POST /leads/:id/send) */
  contactAttempts?: ContactAttempt[];
}
