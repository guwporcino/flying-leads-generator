import { NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: {
    lead: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new LeadsService(prisma as unknown as PrismaService);
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

  describe('send', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.send('missing-id', { approvedBy: 'ana' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('records the approval and marks the lead as sent', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'sent' });

      await service.send('lead-1', { approvedBy: 'ana' });

      const call = prisma.lead.update.mock.calls[0] as unknown as [
        { where: { id: string }; data: { status: string; approvedBy: string } },
      ];
      expect(call[0].where).toEqual({ id: 'lead-1' });
      expect(call[0].data.status).toBe('sent');
      expect(call[0].data.approvedBy).toBe('ana');
    });
  });
});
