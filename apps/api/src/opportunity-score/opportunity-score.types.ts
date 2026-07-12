/** Sinais objetivos usados pela regra determinística — ver ADR 0009. */
export interface RuleScoreInput {
  hasWebsite: boolean;
  copyrightYear: number | null;
  performanceScore: number | null;
  seoScore: number | null;
  hasHttps: boolean | null;
}

export interface RuleScoreResult {
  score: number;
  reason: string;
}
