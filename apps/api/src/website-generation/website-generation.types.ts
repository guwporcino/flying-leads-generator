/** Copy gerado pela IA (módulo 2.5) — nunca código, só conteúdo (ver ADR 0010). */
export interface GeneratedSiteContent {
  seoTitle: string;
  seoDescription: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutText: string;
  services: string[];
  ctaText: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

/** Subconjunto de `Company`/`WebsiteAudit` usado para gerar o site. */
export interface CompanySiteInput {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string;
}

export interface WebsiteGenerationJobData {
  companyId: string;
}
