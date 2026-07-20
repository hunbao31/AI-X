import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { LeaderboardService } from './leaderboard.service';
import { ok } from '../common/api-envelope';

@Controller('api/v1/leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('global')
  async global() {
    const entries = await this.leaderboardService.global();
    return ok(entries, { count: entries.length });
  }

  @Get('class/:classId')
  async forClass(
    @Param('classId') classId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const entries = await this.leaderboardService.forClass(classId, req.user);
    return ok(entries, { count: entries.length });
  }
}
