import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { GamificationService } from './gamification.service';

@Controller('api/v1/gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // Includes computed badges alongside xp/level/streak.
  @Get()
  async getGamification(@Req() req: { user: AuthenticatedUser }) {
    const summary = await this.gamificationService.getFullSummary(req.user.sub);

    return {
      success: true,
      data: summary,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
