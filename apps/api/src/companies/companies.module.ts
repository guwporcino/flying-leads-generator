import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { WebsiteGenerationModule } from '../website-generation/website-generation.module';

@Module({
  imports: [WebsiteGenerationModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
