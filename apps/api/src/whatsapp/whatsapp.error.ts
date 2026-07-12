export class WhatsappSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhatsappSendError';
  }
}
