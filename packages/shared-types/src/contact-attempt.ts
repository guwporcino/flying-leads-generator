/** Canal usado numa tentativa de contato, ver ADR 0012 */
export type ContactChannel = 'whatsapp_api' | 'manual_link';

export type ContactAttemptStatus = 'sent' | 'failed';

/**
 * Histórico de contato de um Lead — uma linha por tentativa de disparo via
 * `POST /leads/:id/send`, usada para auditoria e para evitar duplicidade
 * (ver ADR 0003, ADR 0012).
 */
export interface ContactAttempt {
  id: string;
  leadId: string;
  channel: ContactChannel;
  status: ContactAttemptStatus;
  /**
   * channel="whatsapp_api": id da mensagem retornado pela Cloud API.
   * channel="manual_link": o link wa.me para o operador abrir manualmente.
   */
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}
