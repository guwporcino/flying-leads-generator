import { Injectable, NotFoundException } from '@nestjs/common';
import { Company } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(campaignId?: string): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: campaignId ? { campaignId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }
}
