import { IsIn, IsString } from 'class-validator';

/**
 * Estágios do funil que o operador pode setar manualmente — ver ADR 0013.
 * `not_sent` e `sent` são geridos pelo sistema (gate de envio) e ficam de fora.
 */
export const MANUAL_LEAD_STATUSES = [
  'viewed',
  'replied',
  'interested',
  'meeting',
  'customer',
  'lost',
] as const;

export type ManualLeadStatus = (typeof MANUAL_LEAD_STATUSES)[number];

export class UpdateLeadStatusDto {
  @IsIn(MANUAL_LEAD_STATUSES)
  status!: ManualLeadStatus;

  /** Quem registrou a mudança — mesmo racional de `approvedBy` (ADR 0011). */
  @IsString()
  changedBy!: string;
}
