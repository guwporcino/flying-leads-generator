import { ScrapedWebsiteData } from './scraper/scraper.types';

export interface HeuristicScores {
  performanceScore: number;
  seoScore: number;
}

/** Aproximação leve de performance/SEO a partir de sinais do scraper — não é Lighthouse/CWV real (ver ADR 0008). */
export function computeHeuristicScores(scraped: ScrapedWebsiteData): HeuristicScores {
  let performanceScore = 100;
  if (scraped.loadTimeMs > 5000) performanceScore -= 50;
  else if (scraped.loadTimeMs > 3000) performanceScore -= 30;
  else if (scraped.loadTimeMs > 1500) performanceScore -= 15;
  performanceScore -= Math.min(scraped.brokenLinksCount * 5, 30);

  let seoScore = 0;
  if (scraped.title) seoScore += 30;
  if (scraped.description) seoScore += 30;
  if (scraped.isResponsive) seoScore += 20;
  if (scraped.hasHttps) seoScore += 20;

  return {
    performanceScore: clamp(performanceScore, 0, 100),
    seoScore: clamp(seoScore, 0, 100),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
