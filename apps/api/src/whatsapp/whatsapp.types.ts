export interface WhatsappTemplateMessageResult {
  providerMessageId: string;
}

/** Resposta de sucesso de POST /{phone-number-id}/messages, ver ADR 0012. */
export interface WhatsappSendMessageResponse {
  messaging_product: 'whatsapp';
  messages: Array<{ id: string }>;
}

/** Formato de erro da Graph API — https://developers.facebook.com/docs/graph-api/guides/error-handling */
export interface WhatsappErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}
