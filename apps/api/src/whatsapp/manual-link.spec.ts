import { buildWhatsappManualLink } from './manual-link';

describe('buildWhatsappManualLink', () => {
  it('strips non-digit characters from the phone number', () => {
    const link = buildWhatsappManualLink('+55 (11) 99999-9999', 'Olá!');
    expect(link).toBe('https://wa.me/5511999999999?text=Ol%C3%A1!');
  });

  it('url-encodes the message', () => {
    const link = buildWhatsappManualLink('5511999999999', 'Tudo bem? Vi sua empresa & gostei');
    expect(link).toBe(
      'https://wa.me/5511999999999?text=Tudo%20bem%3F%20Vi%20sua%20empresa%20%26%20gostei',
    );
  });
});
