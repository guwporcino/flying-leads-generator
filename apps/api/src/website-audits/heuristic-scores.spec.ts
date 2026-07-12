import { computeHeuristicScores } from './heuristic-scores';
import { ScrapedWebsiteData } from './scraper/scraper.types';

function buildScraped(overrides: Partial<ScrapedWebsiteData> = {}): ScrapedWebsiteData {
  return {
    title: 'Título',
    description: 'Descrição',
    detectedTechnology: [],
    pageCount: 1,
    loadTimeMs: 800,
    hasHttps: true,
    isResponsive: true,
    brokenLinksCount: 0,
    lastUpdatedDetectedAt: null,
    copyrightYear: null,
    socialLinks: [],
    hasContactForm: false,
    hasMap: false,
    hasBlog: false,
    textExcerpt: '',
    ...overrides,
  };
}

describe('computeHeuristicScores', () => {
  it('scores a fast, complete site highly', () => {
    const { performanceScore, seoScore } = computeHeuristicScores(buildScraped());

    expect(performanceScore).toBe(100);
    expect(seoScore).toBe(100);
  });

  it('penalizes slow load times', () => {
    const { performanceScore } = computeHeuristicScores(buildScraped({ loadTimeMs: 6000 }));

    expect(performanceScore).toBe(50);
  });

  it('penalizes broken links, clamped at a floor of 0', () => {
    const { performanceScore } = computeHeuristicScores(
      buildScraped({ loadTimeMs: 6000, brokenLinksCount: 20 }),
    );

    expect(performanceScore).toBe(20);
  });

  it('scores a bare-minimum site with low SEO', () => {
    const { seoScore } = computeHeuristicScores(
      buildScraped({ title: null, description: null, isResponsive: false, hasHttps: false }),
    );

    expect(seoScore).toBe(0);
  });
});
