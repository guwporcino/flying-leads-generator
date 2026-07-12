import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { GooglePlacesService } from '../google-places/google-places.service';
import { PlaceSearchResultItem } from '../google-places/google-places.types';
import { WebsiteAuditsService } from '../website-audits/website-audits.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

function buildPlace(overrides: Partial<PlaceSearchResultItem> = {}): PlaceSearchResultItem {
  return {
    googlePlaceId: 'places/1',
    name: 'Clínica Sorriso',
    phone: '(31) 3333-4444',
    website: null,
    category: 'dentist',
    openingHours: null,
    reviewCount: 10,
    rating: 4.5,
    description: null,
    latitude: -19.92,
    longitude: -43.93,
    googleMapsUrl: 'https://maps.google.com/?cid=1',
    isOperational: true,
    ...overrides,
  };
}

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: {
    campaign: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    company: { createMany: jest.Mock; findMany: jest.Mock };
  };
  let googlePlaces: { geocode: jest.Mock; searchText: jest.Mock };
  let websiteAudits: { processCompany: jest.Mock };

  const baseDto: CreateCampaignDto = {
    niche: 'dentista',
    city: 'Belo Horizonte',
    radiusKm: 5,
  };

  beforeEach(() => {
    prisma = {
      campaign: {
        create: jest.fn().mockResolvedValue({ id: 'campaign-1', ...baseDto, filters: {} }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      company: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    googlePlaces = {
      geocode: jest
        .fn()
        .mockResolvedValue({ latitude: -19.92, longitude: -43.93, formattedAddress: 'BH' }),
      searchText: jest.fn().mockResolvedValue([buildPlace()]),
    };
    websiteAudits = { processCompany: jest.fn().mockResolvedValue(undefined) };

    service = new CampaignsService(
      prisma as unknown as PrismaService,
      googlePlaces as unknown as GooglePlacesService,
      websiteAudits as unknown as WebsiteAuditsService,
    );
  });

  describe('create', () => {
    it('geocodes the location, searches places, and persists the campaign + companies', async () => {
      await service.create(baseDto);

      expect(googlePlaces.geocode).toHaveBeenCalledWith('Belo Horizonte');
      expect(googlePlaces.searchText).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'dentista em Belo Horizonte',
          latitude: -19.92,
          longitude: -43.93,
          radiusMeters: 5000,
        }),
      );
      expect(prisma.campaign.create).toHaveBeenCalled();
      expect(prisma.company.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ campaignId: 'campaign-1', googlePlaceId: 'places/1' })],
          skipDuplicates: true,
        }),
      );
    });

    it('enqueues a website audit for every persisted company', async () => {
      const persistedCompany = { id: 'company-1', googlePlaceId: 'places/1', website: null };
      prisma.company.findMany.mockResolvedValue([persistedCompany]);

      await service.create(baseDto);

      expect(websiteAudits.processCompany).toHaveBeenCalledWith(persistedCompany);
    });

    it('does not let a failed audit enqueue break campaign creation', async () => {
      const persistedCompany = { id: 'company-1', googlePlaceId: 'places/1', website: null };
      prisma.company.findMany.mockResolvedValue([persistedCompany]);
      websiteAudits.processCompany.mockRejectedValue(new Error('queue unavailable'));

      await expect(service.create(baseDto)).resolves.toEqual(
        expect.objectContaining({ companies: [persistedCompany] }),
      );
    });

    it('prefers the explicit address over city for geocoding', async () => {
      await service.create({ ...baseDto, address: 'Av. Afonso Pena, 1000' });

      expect(googlePlaces.geocode).toHaveBeenCalledWith('Av. Afonso Pena, 1000');
    });

    it('filters out results below the minimum review count', async () => {
      googlePlaces.searchText.mockResolvedValue([
        buildPlace({ googlePlaceId: 'places/low', reviewCount: 2 }),
        buildPlace({ googlePlaceId: 'places/high', reviewCount: 50 }),
      ]);

      await service.create({ ...baseDto, filters: { minReviewCount: 10 } });

      expect(prisma.company.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ googlePlaceId: 'places/high' })],
        }),
      );
    });

    it('drops every result when requireWhatsapp is set, since Google never provides it', async () => {
      await service.create({ ...baseDto, filters: { requireWhatsapp: true } });

      expect(prisma.company.createMany).not.toHaveBeenCalled();
    });

    it('skips persistence entirely when no place survives filtering', async () => {
      googlePlaces.searchText.mockResolvedValue([]);

      const result = await service.create(baseDto);

      expect(prisma.company.createMany).not.toHaveBeenCalled();
      expect(result.companies).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the campaign does not exist', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
