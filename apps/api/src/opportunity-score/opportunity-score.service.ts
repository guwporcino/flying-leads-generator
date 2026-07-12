import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeRuleBasedScore } from './rule-based-score';
import { combineScores } from './combine-scores';
import { RuleScoreInput } from './opportunity-score.types';

@Injectable()
export class OpportunityScoreService {
  constructor(private readonly prisma: PrismaService) {}

  /** Empresa sem website — ver ADR 0009: score 100, sem média com a IA (que nunca roda). */
  async recordNoWebsiteOpportunity(companyId: string): Promise<void> {
    await this.upsert(companyId, 100, null, 'Sem site');
  }

  /** Empresa com website já auditado — combina a regra determinística com o score da IA. */
  async recordFromAudit(
    companyId: string,
    signals: RuleScoreInput,
    aiScore: number,
  ): Promise<void> {
    const { score: ruleBasedScore, reason } = computeRuleBasedScore(signals);
    const finalScore = combineScores(ruleBasedScore, aiScore);
    await this.upsert(companyId, ruleBasedScore, aiScore, reason, finalScore);
  }

  private async upsert(
    companyId: string,
    ruleBasedScore: number,
    aiScore: number | null,
    reason: string,
    finalScore: number = ruleBasedScore,
  ): Promise<void> {
    await this.prisma.opportunityScore.upsert({
      where: { companyId },
      create: { companyId, ruleBasedScore, aiScore, finalScore, reason },
      update: { ruleBasedScore, aiScore, finalScore, reason },
    });
  }
}
