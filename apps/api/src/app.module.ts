import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import IORedis from 'ioredis';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { GooglePlacesModule } from './google-places/google-places.module';
import { WebsiteAuditsModule } from './website-audits/website-audits.module';
import { WebsiteGenerationModule } from './website-generation/website-generation.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CompaniesModule } from './companies/companies.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthGuard } from './auth/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Logs estruturados (ver ADR 0014): JSON em produção, pretty em dev.
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
        autoLogging: { ignore: (req) => req.url === '/health' },
      },
    }),
    // Rate limiting global (ver ADR 0014): 100 req / 60s por IP.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
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
    LeadsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
