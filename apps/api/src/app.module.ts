import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { GooglePlacesModule } from './google-places/google-places.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    GooglePlacesModule,
    CampaignsModule,
    CompaniesModule,
  ],
})
export class AppModule {}
