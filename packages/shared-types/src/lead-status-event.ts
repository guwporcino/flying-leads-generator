import type { LeadStatus } from './lead.js';

/**
 * Histórico de transições do funil de CRM — ver ADR 0013. Gravado em toda
 * mudança de status, inclusive not_sent → sent (gate de envio).
 */
export interface LeadStatusEvent {
  id: string;
  leadId: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  changedBy: string;
  createdAt: string;
}
