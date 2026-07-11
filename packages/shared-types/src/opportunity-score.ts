/** Score de oportunidade combinando regra determinística + avaliação da IA, ver ARCHITECTURE.md §2.4 */
export interface OpportunityScore {
  companyId: string;
  ruleBasedScore: number;
  aiScore: number | null;
  finalScore: number;
  reason: string;
  computedAt: string;
}
