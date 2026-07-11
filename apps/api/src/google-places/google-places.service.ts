import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GooglePlacesApiError } from './google-places.error';
import {
  GeocodedLocation,
  GeocodingResponse,
  PlaceSearchParams,
  PlaceSearchResultItem,
  PlacesTextSearchResponse,
  mapGooglePlaceToSearchResult,
} from './google-places.types';

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_TEXT_SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/** Ver ARCHITECTURE.md §2.1 — campos que pedimos à Places API (New) via field mask. */
const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.primaryType',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.userRatingCount',
  'places.rating',
  'places.editorialSummary',
  'places.location',
  'places.googleMapsUri',
  'places.businessStatus',
].join(',');

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);

  constructor(private readonly config: ConfigService) {}

  /** Geocoding API: resolve um endereço livre (cidade/bairro/CEP) em lat/lng. */
  async geocode(address: string): Promise<GeocodedLocation> {
    const url = new URL(GEOCODING_ENDPOINT);
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.getGeocodingApiKey());

    const response = await fetch(url);
    if (!response.ok) {
      throw new GooglePlacesApiError(`Geocoding request failed with status ${response.status}`);
    }

    const body = (await response.json()) as GeocodingResponse;
    const [result] = body.results;
    if (body.status !== 'OK' || !result) {
      throw new GooglePlacesApiError(
        `Geocoding could not resolve address "${address}" (status: ${body.status})`,
      );
    }

    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  }

  /** Places API (New) Text Search: busca lugares por texto livre + viés de localização. */
  async searchText(params: PlaceSearchParams): Promise<PlaceSearchResultItem[]> {
    const response = await fetch(PLACES_TEXT_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.getPlacesApiKey(),
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: params.query,
        maxResultCount: params.maxResultCount ?? 20,
        openNow: params.openNow,
        locationBias: {
          circle: {
            center: { latitude: params.latitude, longitude: params.longitude },
            radius: params.radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Places Text Search failed: ${response.status} ${errorBody}`);
      throw new GooglePlacesApiError(`Places search failed with status ${response.status}`);
    }

    const body = (await response.json()) as PlacesTextSearchResponse;
    return (body.places ?? []).map(mapGooglePlaceToSearchResult);
  }

  private getPlacesApiKey(): string {
    const key = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!key) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }
    return key;
  }

  private getGeocodingApiKey(): string {
    const key = this.config.get<string>('GOOGLE_GEOCODING_API_KEY');
    if (!key) {
      throw new Error('GOOGLE_GEOCODING_API_KEY is not configured');
    }
    return key;
  }
}
