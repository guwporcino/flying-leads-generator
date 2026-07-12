import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sortByOpportunity } from '../opportunity-score/sort-by-opportunity';
import { WebsiteGenerationService } from '../website-generation/website-generation.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websiteGeneration: WebsiteGenerationService,
  ) {}

  /** Ordenado por Opportunity Score (ver ADR 0009) — quem ainda está na fila (sem score) fica por último. */
  async findAll(campaignId?: string) {
    const companies = await this.prisma.company.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: { opportunityScore: true },
    });
    return sortByOpportunity(companies);
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { websiteAudit: true, opportunityScore: true, lead: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }

  /** Trigger explícito — ver ADR 0010. Não gera automaticamente para toda empresa. */
  async generateWebsite(id: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    await this.websiteGeneration.enqueue(id);
  }
}
