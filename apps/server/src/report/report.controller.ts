import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/types';

@Controller('restaurants/:restaurantId/reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('summary')
  async getSummary(
    @Param('restaurantId') restaurantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getSalesSummary(restaurantId, from, to);
  }
}
