import { IsOptional, IsString } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  approachMessage?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
