/** Classificação da IA avaliadora, ver ARCHITECTURE.md §2.3 */
export type WebsiteGrade = 'Excelente' | 'Bom' | 'Regular' | 'Ruim' | 'Péssimo';

export interface WebsiteAuditFinding {
  criterion: string;
  explanation: string;
}

export interface WebsiteAuditCriteriaScores {
  ui: number;
  ux: number;
  responsiveness: number;
  performance: number;
  seo: number;
  design: number;
  credibility: number;
  modernity: number;
  clarity: number;
  cta: number;
  conversion: number;
}

/**
 * Resultado combinado do Coletor de informações (scraping) e da IA avaliadora,
 * ver ARCHITECTURE.md §2.2 e §2.3. Quando `hasWebsite` é `false`, os demais
 * campos de scraping/avaliação permanecem `null` — a empresa é oportunidade
 * automática (ver OpportunityScore).
 */
export interface WebsiteAudit {
  id: string;
  companyId: string;
  hasWebsite: boolean;

  // Scraping
  title: string | null;
  description: string | null;
  detectedTechnology: string[] | null;
  pageCount: number | null;
  performanceScore: number | null;
  seoScore: number | null;
  brokenLinksCount: number | null;
  hasHttps: boolean | null;
  isResponsive: boolean | null;
  loadTimeMs: number | null;
  lastUpdatedDetectedAt: string | null;
  copyrightYear: number | null;
  socialLinks: string[] | null;
  hasContactForm: boolean | null;
  hasMap: boolean | null;
  hasBlog: boolean | null;

  // IA avaliadora
  aiCriteriaScores: WebsiteAuditCriteriaScores | null;
  aiGrade: WebsiteGrade | null;
  aiFindings: WebsiteAuditFinding[] | null;

  createdAt: string;
}
