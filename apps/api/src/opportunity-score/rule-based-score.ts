import { RuleScoreInput, RuleScoreResult } from './opportunity-score.types';

const OUTDATED_THRESHOLD_YEARS = 8;

/**
 * Regra determinística do Opportunity Score — ver ADR 0009. Não é aditiva:
 * usa a condição de maior score entre as que disparam, para manter o
 * resultado explicável por uma única razão dominante.
 */
export function computeRuleBasedScore(
  input: RuleScoreInput,
  now: Date = new Date(),
): RuleScoreResult {
  if (!input.hasWebsite) {
    return { score: 100, reason: 'Sem site' };
  }

  const candidates: RuleScoreResult[] = [];

  if (
    input.copyrightYear !== null &&
    now.getFullYear() - input.copyrightYear >= OUTDATED_THRESHOLD_YEARS
  ) {
    candidates.push({
      score: 90,
      reason: `Site desatualizado (copyright de ${input.copyrightYear})`,
    });
  }

  if (input.performanceScore !== null && input.performanceScore < 50) {
    candidates.push({ score: 74, reason: 'Site lento' });
  }

  if (input.seoScore !== null && input.seoScore < 40) {
    candidates.push({ score: 60, reason: 'SEO fraco' });
  }

  if (input.hasHttps === false) {
    candidates.push({ score: 55, reason: 'Sem HTTPS' });
  }

  if (candidates.length === 0) {
    return { score: 15, reason: 'Site em boas condições' };
  }

  return candidates.reduce((worst, current) => (current.score > worst.score ? current : worst));
}
