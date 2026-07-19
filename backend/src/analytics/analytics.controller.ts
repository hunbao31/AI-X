import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(@Req() req: { user: AuthenticatedUser }) {
    const summary = await this.analyticsService.getSummary(req.user.sub);

    return {
      success: true,
      data: summary,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
