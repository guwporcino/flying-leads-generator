import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: { company: { findMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      company: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };
    service = new CompaniesService(prisma as unknown as PrismaService);
  });

  it('lists companies filtered by campaignId when provided', async () => {
    await service.findAll('campaign-1');

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaignId: 'campaign-1' } }),
    );
  });

  it('lists all companies when no campaignId is provided', async () => {
    await service.findAll();

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('throws NotFoundException when the company does not exist', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
