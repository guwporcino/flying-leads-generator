import { Module } from '@nestjs/common';
import { GooglePlacesModule } from '../google-places/google-places.module';
import { WebsiteAuditsModule } from '../website-audits/website-audits.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [GooglePlacesModule, WebsiteAuditsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
