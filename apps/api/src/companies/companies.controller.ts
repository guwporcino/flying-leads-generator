import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll(@Query('campaignId') campaignId?: string) {
    return this.companiesService.findAll(campaignId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post(':id/generate-website')
  @HttpCode(HttpStatus.ACCEPTED)
  generateWebsite(@Param('id') id: string) {
    return this.companiesService.generateWebsite(id);
  }
}
