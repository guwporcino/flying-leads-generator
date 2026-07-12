import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScraperService } from './scraper/scraper.service';
import { WebsiteGraderService } from './grader/website-grader.service';
import { WebsiteAuditProcessor } from './website-audit.processor';
import { WebsiteAuditsService } from './website-audits.service';
import { WEBSITE_AUDIT_QUEUE } from './website-audits.constants';
import { OpportunityScoreModule } from '../opportunity-score/opportunity-score.module';

@Module({
  imports: [BullModule.registerQueue({ name: WEBSITE_AUDIT_QUEUE }), OpportunityScoreModule],
  providers: [WebsiteAuditsService, WebsiteAuditProcessor, ScraperService, WebsiteGraderService],
  exports: [WebsiteAuditsService],
})
export class WebsiteAuditsModule {}
