import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScraperService } from './scraper/scraper.service';
import { WebsiteGraderService } from './grader/website-grader.service';
import { WebsiteAuditProcessor } from './website-audit.processor';
import { WebsiteAuditsService } from './website-audits.service';
import { WEBSITE_AUDIT_QUEUE } from './website-audits.constants';

@Module({
  imports: [BullModule.registerQueue({ name: WEBSITE_AUDIT_QUEUE })],
  providers: [WebsiteAuditsService, WebsiteAuditProcessor, ScraperService, WebsiteGraderService],
  exports: [WebsiteAuditsService],
})
export class WebsiteAuditsModule {}
