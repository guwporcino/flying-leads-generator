import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from './scraper/scraper.service';
import { WebsiteGraderService } from './grader/website-grader.service';
import { computeHeuristicScores } from './heuristic-scores';
import { OpportunityScoreService } from '../opportunity-score/opportunity-score.service';
import { WEBSITE_AUDIT_QUEUE } from './website-audits.constants';
import { WebsiteAuditJobData } from './website-audits.types';

@Processor(WEBSITE_AUDIT_QUEUE)
export class WebsiteAuditProcessor extends WorkerHost {
  private readonly logger = new Logger(WebsiteAuditProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: ScraperService,
    private readonly grader: WebsiteGraderService,
    private readonly opportunityScore: OpportunityScoreService,
  ) {
    super();
  }

  async process(job: Job<WebsiteAuditJobData>): Promise<void> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: job.data.companyId },
    });

    if (!company.website) {
      this.logger.warn(`Company ${company.id} has no website — skipping audit job`);
      return;
    }

    const scraped = await this.scraper.analyze(company.website);
    const grade = await this.grader.grade(company.name, company.category, scraped);
    const { performanceScore, seoScore } = computeHeuristicScores(scraped);

    await this.prisma.websiteAudit.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        ...this.toAuditFields(scraped, grade, performanceScore, seoScore),
      },
      update: this.toAuditFields(scraped, grade, performanceScore, seoScore),
    });

    await this.opportunityScore.recordFromAudit(
      company.id,
      {
        hasWebsite: true,
        copyrightYear: scraped.copyrightYear,
        performanceScore,
        seoScore,
        hasHttps: scraped.hasHttps,
      },
      grade.opportunityScore,
    );
  }

  private toAuditFields(
    scraped: Awaited<ReturnType<ScraperService['analyze']>>,
    grade: Awaited<ReturnType<WebsiteGraderService['grade']>>,
    performanceScore: number,
    seoScore: number,
  ) {
    return {
      hasWebsite: true,
      title: scraped.title,
      description: scraped.description,
      detectedTechnology: scraped.detectedTechnology,
      pageCount: scraped.pageCount,
      performanceScore,
      seoScore,
      brokenLinksCount: scraped.brokenLinksCount,
      hasHttps: scraped.hasHttps,
      isResponsive: scraped.isResponsive,
      loadTimeMs: scraped.loadTimeMs,
      lastUpdatedDetectedAt: scraped.lastUpdatedDetectedAt
        ? new Date(scraped.lastUpdatedDetectedAt)
        : null,
      copyrightYear: scraped.copyrightYear,
      socialLinks: scraped.socialLinks,
      hasContactForm: scraped.hasContactForm,
      hasMap: scraped.hasMap,
      hasBlog: scraped.hasBlog,
      aiCriteriaScores: grade.criteriaScores as unknown as Prisma.InputJsonValue,
      aiGrade: grade.grade,
      aiFindings: grade.findings as unknown as Prisma.InputJsonValue,
    };
  }
}
