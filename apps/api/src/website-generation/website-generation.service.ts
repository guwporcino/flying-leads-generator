import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WEBSITE_GENERATION_QUEUE } from './website-generation.constants';
import { WebsiteGenerationJobData } from './website-generation.types';

/** Trigger explícito por empresa — nunca automático para toda a campanha (ver ADR 0010). */
@Injectable()
export class WebsiteGenerationService {
  constructor(
    @InjectQueue(WEBSITE_GENERATION_QUEUE)
    private readonly queue: Queue<WebsiteGenerationJobData>,
  ) {}

  async enqueue(companyId: string): Promise<void> {
    await this.queue.add('generate', { companyId });
  }
}
