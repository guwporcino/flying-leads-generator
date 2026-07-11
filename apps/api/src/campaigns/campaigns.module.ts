import { Module } from '@nestjs/common';
import { GooglePlacesModule } from '../google-places/google-places.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [GooglePlacesModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
