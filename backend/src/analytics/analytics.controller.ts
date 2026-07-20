import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

  @Get('topics')
  async getTopicBreakdown(@Req() req: { user: AuthenticatedUser }) {
    const breakdown = await this.analyticsService.getTopicBreakdown(req.user.sub);

    return {
      success: true,
      data: breakdown,
      meta: { timestamp: new Date().toISOString(), count: breakdown.length },
    };
  }

  // Teacher: most-missed questions (lowest correct rate first).
  @Get('questions')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getQuestionBreakdown(@Req() req: { user: AuthenticatedUser }) {
    const breakdown = await this.analyticsService.getQuestionBreakdown(req.user.sub);

    return {
      success: true,
      data: breakdown,
      meta: { timestamp: new Date().toISOString(), count: breakdown.length },
    };
  }

  // Teacher: avg score / avg time per owned quiz set.
  @Get('sets')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getSetBreakdown(@Req() req: { user: AuthenticatedUser }) {
    const breakdown = await this.analyticsService.getSetBreakdown(req.user.sub);

    return {
      success: true,
      data: breakdown,
      meta: { timestamp: new Date().toISOString(), count: breakdown.length },
    };
  }
}
