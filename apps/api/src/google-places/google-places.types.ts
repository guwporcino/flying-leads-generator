/** Resposta mínima da Geocoding API que usamos — ver https://developers.google.com/maps/documentation/geocoding */
export interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/** Subconjunto do recurso Place da Places API (New) que pedimos via field mask. */
export interface GooglePlaceResult {
  id: string;
  displayName?: { text: string };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  primaryType?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  userRatingCount?: number;
  rating?: number;
  editorialSummary?: { text: string };
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
}

export interface PlacesTextSearchResponse {
  places?: GooglePlaceResult[];
}

export interface PlaceSearchParams {
  /** Texto livre, ex.: "dentista em Belo Horizonte". */
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  openNow?: boolean;
  maxResultCount?: number;
}

/**
 * Resultado já normalizado de uma busca de lugar, pronto para virar um
 * `Company` (ver packages/shared-types) — falta apenas campaignId/whatsapp,
 * que não vêm do Google e são preenchidos pelo caller.
 */
export interface PlaceSearchResultItem {
  googlePlaceId: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string;
  openingHours: string | null;
  reviewCount: number;
  rating: number | null;
  description: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  isOperational: boolean;
}

export function mapGooglePlaceToSearchResult(place: GooglePlaceResult): PlaceSearchResultItem {
  return {
    googlePlaceId: place.id,
    name: place.displayName?.text ?? 'Sem nome',
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    category: place.primaryType ?? 'unknown',
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.join('; ') ?? null,
    reviewCount: place.userRatingCount ?? 0,
    rating: place.rating ?? null,
    description: place.editorialSummary?.text ?? null,
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    googleMapsUrl:
      place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    isOperational: (place.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL',
  };
}
