import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/** Ver ARCHITECTURE.md §2.1 — filtros extras da campanha de busca. */
export class CampaignFiltersDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minReviewCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @IsBoolean()
  onlyOpenNow?: boolean;

  @IsOptional()
  @IsBoolean()
  withoutWebsite?: boolean;

  @IsOptional()
  @IsBoolean()
  withWebsite?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePhone?: boolean;

  @IsOptional()
  @IsBoolean()
  requireWhatsapp?: boolean;
}
