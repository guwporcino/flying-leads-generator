import { Company } from '@prisma/client';
import { CompanySiteInput } from './website-generation.types';

export function toCompanySiteInput(company: Company): CompanySiteInput {
  return {
    id: company.id,
    name: company.name,
    category: company.category,
    phone: company.phone,
    whatsapp: company.whatsapp,
    rating: company.rating,
    reviewCount: company.reviewCount,
    googleMapsUrl: company.googleMapsUrl,
  };
}
