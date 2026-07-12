/**
 * Fallback de "abertura de conversa manual" (ver ARCHITECTURE.md §2.8, ADR
 * 0012) — não é uma automação, é um link que o operador abre e envia à mão.
 */
export function buildWhatsappManualLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
