import { Injectable, NotFoundException } from '@nestjs/common';
import { Campaign, Company, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GooglePlacesService } from '../google-places/google-places.service';
import { PlaceSearchResultItem } from '../google-places/google-places.types';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googlePlaces: GooglePlacesService,
  ) {}

  async create(dto: CreateCampaignDto): Promise<Campaign & { companies: Company[] }> {
    const location = await this.googlePlaces.geocode(this.buildLocationQuery(dto));

    const results = await this.googlePlaces.searchText({
      query: this.buildSearchQuery(dto),
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: dto.radiusKm * 1000,
      openNow: dto.filters?.onlyOpenNow,
    });

    const filtered = this.applyExtraFilters(results, dto.filters);

    const campaign = await this.prisma.campaign.create({
      data: {
        niche: dto.niche,
        city: dto.city,
        neighborhood: dto.neighborhood ?? null,
        postalCode: dto.postalCode ?? null,
        address: dto.address ?? null,
        radiusKm: dto.radiusKm,
        filters: JSON.parse(JSON.stringify(dto.filters ?? {})) as Prisma.InputJsonValue,
      },
    });

    if (filtered.length > 0) {
      // Um Place já visto por outra campanha (googlePlaceId único) não é duplicado;
      // fica associado à campanha que o descobriu primeiro.
      await this.prisma.company.createMany({
        data: filtered.map((place) => this.toCompanyCreateInput(place, campaign.id)),
        skipDuplicates: true,
      });
    }

    const companies = await this.prisma.company.findMany({
      where: { googlePlaceId: { in: filtered.map((place) => place.googlePlaceId) } },
    });

    return { ...campaign, companies };
  }

  findAll(): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Campaign & { companies: Company[] }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { companies: true },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  private buildLocationQuery(dto: CreateCampaignDto): string {
    if (dto.address) return dto.address;
    if (dto.postalCode) return dto.postalCode;
    if (dto.neighborhood) return `${dto.neighborhood}, ${dto.city}`;
    return dto.city;
  }

  private buildSearchQuery(dto: CreateCampaignDto): string {
    const place = dto.neighborhood ? `${dto.neighborhood}, ${dto.city}` : dto.city;
    return `${dto.niche} em ${place}`;
  }

  private applyExtraFilters(
    results: PlaceSearchResultItem[],
    filters?: CampaignFiltersDto,
  ): PlaceSearchResultItem[] {
    if (!filters) return results;

    return results.filter((place) => {
      if (filters.minReviewCount !== undefined && place.reviewCount < filters.minReviewCount) {
        return false;
      }
      if (filters.maxRating !== undefined && (place.rating ?? 0) > filters.maxRating) {
        return false;
      }
      if (filters.withoutWebsite && place.website) return false;
      if (filters.withWebsite && !place.website) return false;
      if (filters.requirePhone && !place.phone) return false;
      // O Google não expõe WhatsApp; nenhum resultado atende esse filtro ainda
      // (ver ARCHITECTURE.md §2.1 — dado vira disponível só depois do scraper, Fase 2).
      if (filters.requireWhatsapp) return false;
      return true;
    });
  }

  private toCompanyCreateInput(
    place: PlaceSearchResultItem,
    campaignId: string,
  ): Prisma.CompanyCreateManyInput {
    return {
      campaignId,
      name: place.name,
      phone: place.phone,
      whatsapp: null,
      website: place.website,
      category: place.category,
      openingHours: place.openingHours,
      reviewCount: place.reviewCount,
      rating: place.rating,
      photos: [],
      description: place.description,
      latitude: place.latitude,
      longitude: place.longitude,
      googleMapsUrl: place.googleMapsUrl,
      googlePlaceId: place.googlePlaceId,
    };
  }
}
