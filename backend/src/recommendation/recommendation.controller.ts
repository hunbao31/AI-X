import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { MasteryStore } from '../mastery/mastery.store';
import { RecommendationService } from './recommendation.service';

// Same hardcoded topic used by mastery tracking (Step 6).
const TOPIC = 'algebra';

@Controller('api/v1/recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly masteryStore: MasteryStore,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get()
  async getRecommendation(@Req() req: { user: AuthenticatedUser }) {
    const records = await this.masteryStore.findAllByUser(req.user.sub);
    const record = records.find((r) => r.topic === TOPIC);

    // No attempts yet → treat as score 0, which correctly falls into
    // "Review basics" rather than crashing or returning nothing.
    const score = record?.score ?? 0;
    const recommendation = this.recommendationService.getRecommendation(score);

    return {
      success: true,
      data: recommendation,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
