import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Company } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WEBSITE_AUDIT_QUEUE } from './website-audits.constants';
import { WebsiteAuditJobData } from './website-audits.types';

@Injectable()
export class WebsiteAuditsService {
  constructor(
    @InjectQueue(WEBSITE_AUDIT_QUEUE) private readonly queue: Queue<WebsiteAuditJobData>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Ver ARCHITECTURE.md §2.2: empresas sem website são marcadas como
   * oportunidade imediatamente, sem entrar na fila. Empresas com website
   * são enfileiradas para scraping + avaliação assíncrona.
   */
  async processCompany(company: Company): Promise<void> {
    if (!company.website) {
      await this.markAsOpportunity(company.id);
      return;
    }
    await this.queue.add('audit', { companyId: company.id });
  }

  private async markAsOpportunity(companyId: string): Promise<void> {
    await this.prisma.websiteAudit.upsert({
      where: { companyId },
      create: { companyId, hasWebsite: false, detectedTechnology: [], socialLinks: [] },
      update: { hasWebsite: false },
    });
  }
}
