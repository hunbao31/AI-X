import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { MasteryStore } from '../mastery/mastery.store';
import { AnalyticsService } from '../analytics/analytics.service';
import { RecommendationService } from './recommendation.service';
import { ok } from '../common/api-envelope';

@Controller('api/v1/recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly masteryStore: MasteryStore,
    private readonly analyticsService: AnalyticsService,
    private readonly recommendationService: RecommendationService,
  ) {}

  // Overall recommendation based on average mastery across every topic the
  // user has touched (used to hardcode topic "algebra" pre-upgrade).
  @Get()
  async getRecommendation(@Req() req: { user: AuthenticatedUser }) {
    const records = await this.masteryStore.findAllByUser(req.user.sub);

    // No attempts yet → treat as score 0, which correctly falls into
    // "Review basics" rather than crashing or returning nothing.
    const average =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.score, 0) / records.length
        : 0;

    return ok(this.recommendationService.getRecommendation(average));
  }

  // Per-topic adaptive plan: weakest topics first, each tagged
  // repeat / practice / advance.
  @Get('topics')
  async getTopicRecommendations(@Req() req: { user: AuthenticatedUser }) {
    const breakdown = await this.analyticsService.getTopicBreakdown(req.user.sub);
    const recommendations =
      this.recommendationService.getTopicRecommendations(breakdown);
    return ok(recommendations, { count: recommendations.length });
  }
}
