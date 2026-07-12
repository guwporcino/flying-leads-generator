import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ContentGeneratorService } from './content-generator/content-generator.service';
import { GitHubDeployService } from './github-deploy/github-deploy.service';
import { VercelDeployService } from './vercel-deploy/vercel-deploy.service';
import { renderSiteFiles } from './site-template';
import { slugify } from './slugify';
import { toCompanySiteInput } from './company-site-input';
import { WEBSITE_GENERATION_QUEUE } from './website-generation.constants';
import { WebsiteGenerationJobData } from './website-generation.types';

@Processor(WEBSITE_GENERATION_QUEUE)
export class WebsiteGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(WebsiteGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerator: ContentGeneratorService,
    private readonly github: GitHubDeployService,
    private readonly vercel: VercelDeployService,
  ) {
    super();
  }

  async process(job: Job<WebsiteGenerationJobData>): Promise<void> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: job.data.companyId },
    });
    const companySiteInput = toCompanySiteInput(company);
    const slug = slugify(company.name, company.id);

    const content = await this.contentGenerator.generate(companySiteInput);
    const files = renderSiteFiles(companySiteInput, content);

    await this.github.commitFiles(`sites/${slug}`, files, `Generate site for ${company.name}`);
    this.logger.log(`Committed generated site for company ${company.id} at sites/${slug}`);

    const deployment = await this.vercel.deploy(slug, files);

    await this.prisma.lead.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, previewUrl: deployment.previewUrl },
      update: { previewUrl: deployment.previewUrl },
    });
  }
}
