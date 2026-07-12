/**
 * Ordena por `opportunityScore.finalScore` descendente, com quem ainda não
 * tem score (na fila) por último — ver ADR 0009.
 *
 * Feito em memória porque o Prisma não suporta `nulls: 'last'` em orderBy
 * através de uma relação (só em campos escalares diretos do model).
 */
export function sortByOpportunity<T extends { opportunityScore: { finalScore: number } | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = a.opportunityScore?.finalScore ?? -1;
    const scoreB = b.opportunityScore?.finalScore ?? -1;
    return scoreB - scoreA;
  });
}
