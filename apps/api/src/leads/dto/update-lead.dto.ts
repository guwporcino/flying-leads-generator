import { IsDateString, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  approachMessage?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Follow-up (ver ADR 0013). `null` limpa o lembrete. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  nextActionAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  nextActionNote?: string | null;
}
