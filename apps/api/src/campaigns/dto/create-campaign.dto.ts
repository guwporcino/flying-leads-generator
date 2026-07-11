import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CampaignFiltersDto } from './campaign-filters.dto';

const SEARCH_RADIUS_KM_OPTIONS = [1, 3, 5, 10, 20] as const;
export type SearchRadiusKm = (typeof SEARCH_RADIUS_KM_OPTIONS)[number];

export class CreateCampaignDto {
  @IsString()
  niche!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsIn(SEARCH_RADIUS_KM_OPTIONS)
  radiusKm!: SearchRadiusKm;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignFiltersDto)
  filters?: CampaignFiltersDto;
}
