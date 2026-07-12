import { Module } from '@nestjs/common';
import { OpportunityScoreService } from './opportunity-score.service';

@Module({
  providers: [OpportunityScoreService],
  exports: [OpportunityScoreService],
})
export class OpportunityScoreModule {}
