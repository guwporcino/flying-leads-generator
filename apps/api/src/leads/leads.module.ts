import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [WhatsappModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
