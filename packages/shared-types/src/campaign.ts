export type SearchRadiusKm = 1 | 3 | 5 | 10 | 20;

/** Filtros extras de campanha — módulo "Google Maps Search", ver ARCHITECTURE.md §2.1 */
export interface CampaignFilters {
  minReviewCount?: number;
  maxRating?: number;
  onlyOpenNow?: boolean;
  withoutWebsite?: boolean;
  withWebsite?: boolean;
  requirePhone?: boolean;
  requireWhatsapp?: boolean;
}

export interface Campaign {
  id: string;
  niche: string;
  city: string;
  neighborhood: string | null;
  postalCode: string | null;
  address: string | null;
  radiusKm: SearchRadiusKm;
  filters: CampaignFilters;
  createdAt: string;
}
