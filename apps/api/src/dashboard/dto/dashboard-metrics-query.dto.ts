import { IsDateString, IsOptional } from 'class-validator';

/** Período das métricas — default: o dia corrente (UTC), ver ADR 0013. */
export class DashboardMetricsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
