/** Média simples do score determinístico com o score da IA — ver ADR 0009. */
export function combineScores(ruleBasedScore: number, aiScore: number): number {
  const average = (ruleBasedScore + aiScore) / 2;
  return Math.round(clamp(average, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
