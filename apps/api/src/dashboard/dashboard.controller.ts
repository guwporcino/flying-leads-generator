import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsQueryDto } from './dto/dashboard-metrics-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@Query() query: DashboardMetricsQueryDto) {
    return this.dashboardService.getMetrics(query);
  }
}
