import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and dasherizes the name', () => {
    expect(slugify('Clínica Sorriso', '123')).toBe('clinica-sorriso-123');
  });

  it('strips accents', () => {
    expect(slugify('Açaí & Cia', '123')).toBe('acai-cia-123');
  });

  it('uses only the first 8 chars of the companyId, dashes stripped', () => {
    const companyId = 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    expect(slugify('Loja', companyId)).toBe('loja-abcd1234');
  });

  it('falls back to "empresa" when the name has no usable characters', () => {
    expect(slugify('!!!', '123')).toBe('empresa-123');
  });
});
