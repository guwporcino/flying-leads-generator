import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SendLeadDto } from './dto/send-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll() {
    return this.leadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto);
  }

  @Post(':id/send')
  send(@Param('id') id: string, @Body() dto: SendLeadDto) {
    return this.leadsService.send(id, dto);
  }
}
