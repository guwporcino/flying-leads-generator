const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/** Slug estável e único por lead: nome legível + sufixo curto do companyId (evita colisão). */
export function slugify(name: string, companyId: string): string {
  const base = name
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const suffix = companyId.replace(/-/g, '').slice(0, 8);
  return `${base || 'empresa'}-${suffix}`;
}
