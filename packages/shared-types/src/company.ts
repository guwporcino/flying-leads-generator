/** Contrato de saída do módulo "Google Maps Search", ver ARCHITECTURE.md §2.1 */
export interface Company {
  id: string;
  campaignId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  category: string;
  openingHours: string | null;
  reviewCount: number;
  rating: number | null;
  photos: string[];
  description: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  googlePlaceId: string;
  createdAt: string;
}
