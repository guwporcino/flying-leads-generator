import { ConflictException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: {
    lead: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    contactAttempt: { create: jest.Mock };
  };
  let whatsapp: { isConfigured: jest.Mock; sendTemplateMessage: jest.Mock };

  beforeEach(() => {
    prisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      contactAttempt: { create: jest.fn() },
    };
    whatsapp = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendTemplateMessage: jest.fn(),
    };
    service = new LeadsService(
      prisma as unknown as PrismaService,
      whatsapp as unknown as WhatsappService,
    );
  });

  describe('findAll', () => {
    it('sorts leads by the company opportunity score, pending ones last', async () => {
      prisma.lead.findMany.mockResolvedValue([
        { id: 'low', company: { opportunityScore: { finalScore: 15 } } },
        { id: 'pending', company: { opportunityScore: null } },
        { id: 'high', company: { opportunityScore: { finalScore: 90 } } },
      ]);

      const result = await service.findAll();

      expect(result.map((lead) => lead.id)).toEqual(['high', 'low', 'pending']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', { notes: 'x' })).rejects.toThrow(NotFoundException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('updates the approach message and notes', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', notes: 'ligar amanhã' });

      await service.update('lead-1', { notes: 'ligar amanhã' });

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: { notes: 'ligar amanhã' },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing-id', { status: 'replied', changedBy: 'ana' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('rejects moving a lead that has not been sent yet', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1', status: 'not_sent' });

      await expect(
        service.updateStatus('lead-1', { status: 'replied', changedBy: 'ana' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('is a no-op when the status is unchanged (no event recorded)', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1', status: 'replied' });
      prisma.lead.findUniqueOrThrow.mockResolvedValue({ id: 'lead-1', status: 'replied' });

      await service.updateStatus('lead-1', { status: 'replied', changedBy: 'ana' });

      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('updates the status and records a LeadStatusEvent', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1', status: 'sent' });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'replied' });

      await service.updateStatus('lead-1', { status: 'replied', changedBy: 'ana' });

      const call = prisma.lead.update.mock.calls[0] as unknown as [
        {
          where: { id: string };
          data: {
            status: string;
            statusEvents: {
              create: { fromStatus: string; toStatus: string; changedBy: string };
            };
          };
        },
      ];
      expect(call[0].where).toEqual({ id: 'lead-1' });
      expect(call[0].data.status).toBe('replied');
      expect(call[0].data.statusEvents.create).toEqual({
        fromStatus: 'sent',
        toStatus: 'replied',
        changedBy: 'ana',
      });
    });
  });

  describe('send', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.send('missing-id', { approvedBy: 'ana' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the lead was already sent', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        status: 'sent',
        company: { whatsapp: '5511999999999', phone: null },
      });

      await expect(service.send('lead-1', { approvedBy: 'ana' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lead.update).not.toHaveBeenCalled();
      expect(prisma.contactAttempt.create).not.toHaveBeenCalled();
    });

    it('sends via the WhatsApp Cloud API when configured and records a whatsapp_api attempt', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        status: 'not_sent',
        approachMessage: 'Olá!',
        company: { whatsapp: '5511999999999', phone: null },
      });
      whatsapp.isConfigured.mockReturnValue(true);
      whatsapp.sendTemplateMessage.mockResolvedValue({ providerMessageId: 'wamid.123' });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'sent' });

      await service.send('lead-1', { approvedBy: 'ana' });

      expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith('5511999999999', 'Olá!');
      expect(prisma.contactAttempt.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          channel: 'whatsapp_api',
          status: 'sent',
          providerMessageId: 'wamid.123',
        },
      });
      const call = prisma.lead.update.mock.calls[0] as unknown as [
        { where: { id: string }; data: { status: string; approvedBy: string } },
      ];
      expect(call[0].where).toEqual({ id: 'lead-1' });
      expect(call[0].data.status).toBe('sent');
      expect(call[0].data.approvedBy).toBe('ana');
    });

    it('falls back to a manual wa.me link when the Cloud API is not configured', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        status: 'not_sent',
        approachMessage: 'Olá!',
        company: { whatsapp: '5511999999999', phone: null },
      });
      whatsapp.isConfigured.mockReturnValue(false);
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'sent' });

      await service.send('lead-1', { approvedBy: 'ana' });

      expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
      expect(prisma.contactAttempt.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          channel: 'manual_link',
          status: 'sent',
          providerMessageId: 'https://wa.me/5511999999999?text=Ol%C3%A1!',
        },
      });
    });

    it('falls back to a manual link when the Cloud API call fails', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        status: 'not_sent',
        approachMessage: 'Olá!',
        company: { whatsapp: '5511999999999', phone: null },
      });
      whatsapp.isConfigured.mockReturnValue(true);
      whatsapp.sendTemplateMessage.mockRejectedValue(new Error('template not approved'));
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'sent' });

      await service.send('lead-1', { approvedBy: 'ana' });

      expect(prisma.contactAttempt.create).toHaveBeenNthCalledWith(1, {
        data: {
          leadId: 'lead-1',
          channel: 'whatsapp_api',
          status: 'failed',
          errorMessage: 'template not approved',
        },
      });
      expect(prisma.contactAttempt.create).toHaveBeenNthCalledWith(2, {
        data: {
          leadId: 'lead-1',
          channel: 'manual_link',
          status: 'sent',
          providerMessageId: 'https://wa.me/5511999999999?text=Ol%C3%A1!',
        },
      });
    });

    it('records a failed manual_link attempt when the lead has no phone at all', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        status: 'not_sent',
        approachMessage: 'Olá!',
        company: { whatsapp: null, phone: null },
      });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'sent' });

      await service.send('lead-1', { approvedBy: 'ana' });

      expect(prisma.contactAttempt.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          channel: 'manual_link',
          status: 'failed',
          errorMessage: 'Lead sem telefone/WhatsApp cadastrado',
        },
      });
    });
  });
});
