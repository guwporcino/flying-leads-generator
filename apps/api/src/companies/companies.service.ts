import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sortByOpportunity } from '../opportunity-score/sort-by-opportunity';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { websiteAudit: true, opportunityScore: true },
    });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }
}
