/** Saída do `ScraperService`, ver ARCHITECTURE.md §2.2 e ADR 0008. */
export interface ScrapedWebsiteData {
  title: string | null;
  description: string | null;
  detectedTechnology: string[];
  pageCount: number;
  loadTimeMs: number;
  hasHttps: boolean;
  isResponsive: boolean;
  brokenLinksCount: number;
  lastUpdatedDetectedAt: string | null;
  copyrightYear: number | null;
  socialLinks: string[];
  hasContactForm: boolean;
  hasMap: boolean;
  hasBlog: boolean;
  /** Texto visível da página (truncado) — insumo para o `WebsiteGraderService`. */
  textExcerpt: string;
}
