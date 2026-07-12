import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsiteGenerationService } from '../website-generation/website-generation.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: { company: { findMany: jest.Mock; findUnique: jest.Mock } };
  let websiteGeneration: { enqueue: jest.Mock };

  beforeEach(() => {
    prisma = {
      company: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };
    websiteGeneration = { enqueue: jest.fn() };
    service = new CompaniesService(
      prisma as unknown as PrismaService,
      websiteGeneration as unknown as WebsiteGenerationService,
    );
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

  describe('generateWebsite', () => {
    it('enqueues generation when the company exists', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });

      await service.generateWebsite('company-1');

      expect(websiteGeneration.enqueue).toHaveBeenCalledWith('company-1');
    });

    it('throws NotFoundException without enqueueing when the company does not exist', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(service.generateWebsite('missing-id')).rejects.toThrow(NotFoundException);
      expect(websiteGeneration.enqueue).not.toHaveBeenCalled();
    });
  });
});
