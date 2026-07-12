import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';

interface HealthResponse {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  /** Probe de infraestrutura — público e sem rate limit (ver ADR 0014). */
  @Public()
  @SkipThrottle()
  @Get()
  check(): HealthResponse {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }
}
