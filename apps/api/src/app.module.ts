import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { GooglePlacesModule } from './google-places/google-places.module';
import { WebsiteAuditsModule } from './website-audits/website-audits.module';
import { WebsiteGenerationModule } from './website-generation/website-generation.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: new IORedis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    HealthModule,
    GooglePlacesModule,
    WebsiteAuditsModule,
    WebsiteGenerationModule,
    CampaignsModule,
    CompaniesModule,
  ],
})
export class AppModule {}
