import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { SendLeadDto } from './dto/send-lead.dto';

const LEAD_INCLUDE = {
  company: { include: { opportunityScore: true, websiteAudit: true } },
} as const;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ordenado pelo Opportunity Score da empresa (ver ADR 0009) — quem ainda está na fila fica por último. */
  async findAll() {
    const leads = await this.prisma.lead.findMany({ include: LEAD_INCLUDE });
    return [...leads].sort(
      (a, b) =>
        (b.company.opportunityScore?.finalScore ?? -1) -
        (a.company.opportunityScore?.finalScore ?? -1),
    );
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.ensureExists(id);
    return this.prisma.lead.update({ where: { id }, data: dto, include: LEAD_INCLUDE });
  }

  /**
   * Gate de aprovação humana (ver ADR 0011). Não dispara nenhum envio real
   * de WhatsApp ainda — isso é escopo da Fase 6.
   */
  async send(id: string, dto: SendLeadDto) {
    await this.ensureExists(id);
    const now = new Date();
    return this.prisma.lead.update({
      where: { id },
      data: { status: 'sent', approvedBy: dto.approvedBy, approvedAt: now, sentAt: now },
      include: LEAD_INCLUDE,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
  }
}
