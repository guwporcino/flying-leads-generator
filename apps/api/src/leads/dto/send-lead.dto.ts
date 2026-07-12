import { IsString } from 'class-validator';

/** Gate de aprovação humana — ver ADR 0011. Não há autenticação ainda, então quem aprovou é texto livre. */
export class SendLeadDto {
  @IsString()
  approvedBy!: string;
}
