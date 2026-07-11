import { ConfigService } from '@nestjs/config';
import { GooglePlacesService } from './google-places.service';
import { GooglePlacesApiError } from './google-places.error';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  let config: ConfigService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) =>
        key === 'GOOGLE_PLACES_API_KEY' ? 'places-key' : 'geocoding-key',
      ),
    } as unknown as ConfigService;
    service = new GooglePlacesService(config);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('geocode', () => {
    it('resolves an address to coordinates', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          status: 'OK',
          results: [
            {
              formatted_address: 'Belo Horizonte, MG, Brazil',
              geometry: { location: { lat: -19.9245, lng: -43.9352 } },
            },
          ],
        }),
      );

      const result = await service.geocode('Belo Horizonte, MG');

      expect(result).toEqual({
        latitude: -19.9245,
        longitude: -43.9352,
        formattedAddress: 'Belo Horizonte, MG, Brazil',
      });
    });

    it('throws GooglePlacesApiError when Google returns a non-OK status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ZERO_RESULTS', results: [] }));

      await expect(service.geocode('endereço inexistente')).rejects.toThrow(GooglePlacesApiError);
    });

    it('throws GooglePlacesApiError on HTTP failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));

      await expect(service.geocode('Belo Horizonte, MG')).rejects.toThrow(GooglePlacesApiError);
    });
  });

  describe('searchText', () => {
    const searchParams = {
      query: 'dentista em Belo Horizonte',
      latitude: -19.9245,
      longitude: -43.9352,
      radiusMeters: 5000,
    };

    it('maps Google place results to the normalized shape', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          places: [
            {
              id: 'places/abc123',
              displayName: { text: 'Clínica Sorriso' },
              nationalPhoneNumber: '(31) 3333-4444',
              websiteUri: 'https://clinicasorriso.example',
              primaryType: 'dentist',
              userRatingCount: 42,
              rating: 4.7,
              location: { latitude: -19.92, longitude: -43.93 },
              googleMapsUri: 'https://maps.google.com/?cid=123',
              businessStatus: 'OPERATIONAL',
            },
          ],
        }),
      );

      const [result] = await service.searchText(searchParams);

      expect(result).toMatchObject({
        googlePlaceId: 'places/abc123',
        name: 'Clínica Sorriso',
        phone: '(31) 3333-4444',
        website: 'https://clinicasorriso.example',
        category: 'dentist',
        reviewCount: 42,
        rating: 4.7,
        isOperational: true,
      });

      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(requestInit.headers).toMatchObject({ 'X-Goog-Api-Key': 'places-key' });
    });

    it('throws GooglePlacesApiError on HTTP failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 403));

      await expect(service.searchText(searchParams)).rejects.toThrow(GooglePlacesApiError);
    });

    it('returns an empty array when Google returns no places', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      await expect(service.searchText(searchParams)).resolves.toEqual([]);
    });
  });
});
