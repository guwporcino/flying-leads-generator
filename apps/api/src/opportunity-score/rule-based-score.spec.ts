import { computeRuleBasedScore } from './rule-based-score';
import { RuleScoreInput } from './opportunity-score.types';

const NOW = new Date('2026-07-12T00:00:00Z');

function buildInput(overrides: Partial<RuleScoreInput> = {}): RuleScoreInput {
  return {
    hasWebsite: true,
    copyrightYear: null,
    performanceScore: 90,
    seoScore: 90,
    hasHttps: true,
    ...overrides,
  };
}

describe('computeRuleBasedScore', () => {
  it('scores 100 when the company has no website', () => {
    const result = computeRuleBasedScore(buildInput({ hasWebsite: false }), NOW);

    expect(result).toEqual({ score: 100, reason: 'Sem site' });
  });

  it('flags a very outdated site by copyright year', () => {
    const result = computeRuleBasedScore(buildInput({ copyrightYear: 2015 }), NOW);

    expect(result.score).toBe(90);
    expect(result.reason).toContain('2015');
  });

  it('does not flag a recently updated site', () => {
    const result = computeRuleBasedScore(buildInput({ copyrightYear: 2023 }), NOW);

    expect(result.reason).not.toContain('desatualizado');
  });

  it('flags a slow site', () => {
    const result = computeRuleBasedScore(buildInput({ performanceScore: 30 }), NOW);

    expect(result).toEqual({ score: 74, reason: 'Site lento' });
  });

  it('flags weak SEO', () => {
    const result = computeRuleBasedScore(buildInput({ seoScore: 20 }), NOW);

    expect(result).toEqual({ score: 60, reason: 'SEO fraco' });
  });

  it('flags missing HTTPS', () => {
    const result = computeRuleBasedScore(buildInput({ hasHttps: false }), NOW);

    expect(result).toEqual({ score: 55, reason: 'Sem HTTPS' });
  });

  it('picks the worst (highest-score) condition when several apply', () => {
    const result = computeRuleBasedScore(
      buildInput({ copyrightYear: 2010, performanceScore: 20, hasHttps: false }),
      NOW,
    );

    expect(result.score).toBe(90);
    expect(result.reason).toContain('desatualizado');
  });

  it('scores a healthy site at the 15-point baseline', () => {
    const result = computeRuleBasedScore(buildInput(), NOW);

    expect(result).toEqual({ score: 15, reason: 'Site em boas condições' });
  });
});
