import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentGeneratorService } from './content-generator/content-generator.service';
import { GitHubDeployService } from './github-deploy/github-deploy.service';
import { VercelDeployService } from './vercel-deploy/vercel-deploy.service';
import { ApproachMessageService } from './approach-message/approach-message.service';
import { WebsiteGenerationProcessor } from './website-generation.processor';
import { WebsiteGenerationService } from './website-generation.service';
import { WEBSITE_GENERATION_QUEUE } from './website-generation.constants';

@Module({
  imports: [BullModule.registerQueue({ name: WEBSITE_GENERATION_QUEUE })],
  providers: [
    WebsiteGenerationService,
    WebsiteGenerationProcessor,
    ContentGeneratorService,
    GitHubDeployService,
    VercelDeployService,
    ApproachMessageService,
  ],
  exports: [WebsiteGenerationService],
})
export class WebsiteGenerationModule {}
