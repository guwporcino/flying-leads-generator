import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { buildWhatsappManualLink } from '../whatsapp/manual-link';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SendLeadDto } from './dto/send-lead.dto';

const LEAD_INCLUDE = {
  company: { include: { opportunityScore: true, websiteAudit: true } },
} as const;

const SEND_INCLUDE = {
  ...LEAD_INCLUDE,
  contactAttempts: { orderBy: { createdAt: 'desc' as const }, take: 1 },
} as const;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

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
    return this.prisma.lead.update({
      where: { id },
      data: {
        approachMessage: dto.approachMessage,
        notes: dto.notes,
        nextActionAt:
          dto.nextActionAt === undefined
            ? undefined
            : dto.nextActionAt === null
              ? null
              : new Date(dto.nextActionAt),
        nextActionNote: dto.nextActionNote,
      },
      include: LEAD_INCLUDE,
    });
  }

  /**
   * Mudança manual de estágio do funil (ver ADR 0013). Só vale para leads já
   * enviados — a única saída de `not_sent` é o gate de aprovação (`send`).
   * Toda mudança grava um LeadStatusEvent.
   */
  async updateStatus(id: string, dto: UpdateLeadStatusDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    if (lead.status === 'not_sent') {
      throw new ConflictException(
        `Lead ${id} has not been sent yet — use POST /leads/${id}/send first`,
      );
    }
    if (lead.status === dto.status) {
      return this.prisma.lead.findUniqueOrThrow({ where: { id }, include: LEAD_INCLUDE });
    }
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        statusEvents: {
          create: { fromStatus: lead.status, toStatus: dto.status, changedBy: dto.changedBy },
        },
      },
      include: LEAD_INCLUDE,
    });
  }

  /**
   * Gate de aprovação humana (ver ADR 0011) e ponto de disparo real do
   * WhatsApp (ver ADR 0012). Recusa reenvio de um lead já aprovado — é a
   * defesa principal contra mensagens duplicadas (ver ADR 0003).
   */
  async send(id: string, dto: SendLeadDto) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    if (lead.status !== 'not_sent') {
      throw new ConflictException(`Lead ${id} already has status "${lead.status}"`);
    }

    await this.dispatch(
      lead.id,
      lead.company.whatsapp ?? lead.company.phone,
      lead.approachMessage ?? '',
    );

    const now = new Date();
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: 'sent',
        approvedBy: dto.approvedBy,
        approvedAt: now,
        sentAt: now,
        statusEvents: {
          create: { fromStatus: 'not_sent', toStatus: 'sent', changedBy: dto.approvedBy },
        },
      },
      include: SEND_INCLUDE,
    });
  }

  /**
   * Tenta a API oficial primeiro (exige número de WhatsApp cadastrado e
   * credenciais configuradas); em qualquer outro caso cai no fallback de
   * abertura de conversa manual (ver ADR 0012). Sempre grava um
   * ContactAttempt, mesmo quando não há telefone algum.
   */
  private async dispatch(leadId: string, phone: string | null, message: string): Promise<void> {
    if (phone && this.whatsapp.isConfigured()) {
      try {
        const result = await this.whatsapp.sendTemplateMessage(phone, message);
        await this.prisma.contactAttempt.create({
          data: {
            leadId,
            channel: 'whatsapp_api',
            status: 'sent',
            providerMessageId: result.providerMessageId,
          },
        });
        return;
      } catch (error) {
        await this.prisma.contactAttempt.create({
          data: {
            leadId,
            channel: 'whatsapp_api',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        });
      }
    }

    if (phone) {
      await this.prisma.contactAttempt.create({
        data: {
          leadId,
          channel: 'manual_link',
          status: 'sent',
          providerMessageId: buildWhatsappManualLink(phone, message),
        },
      });
      return;
    }

    await this.prisma.contactAttempt.create({
      data: {
        leadId,
        channel: 'manual_link',
        status: 'failed',
        errorMessage: 'Lead sem telefone/WhatsApp cadastrado',
      },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
  }
}
