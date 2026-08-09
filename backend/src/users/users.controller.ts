import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { UsersService } from './users.service';
import { ok } from '../common/api-envelope';

interface UpdateSettingsBody {
  theme?: unknown;
}

interface UpdateProfileBody {
  username?: unknown;
  avatar?: unknown;
}

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return ok(await this.usersService.getProfile(req.user.sub));
  }

  @Get('me/continue')
  async getContinue(@Req() req: AuthenticatedRequest) {
    return ok(await this.usersService.getContinue(req.user.sub));
  }

  @Get('me/quiz-history')
  async getQuizHistory(@Req() req: AuthenticatedRequest) {
    const history = await this.usersService.getQuizHistory(req.user.sub);
    return ok(history, { count: history.length });
  }

  @Get('me/recent-activity')
  async getRecentActivity(@Req() req: AuthenticatedRequest) {
    return ok(await this.usersService.getRecentActivity(req.user.sub));
  }

  // Quick profile edit: username and/or avatar.
  @Patch('me')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProfileBody,
  ) {
    return ok(
      await this.usersService.updateProfile(req.user.sub, {
        username: body?.username,
        avatar: body?.avatar,
      }),
    );
  }

  @Patch('me/settings')
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateSettingsBody,
  ) {
    return ok(await this.usersService.updateSettings(req.user.sub, body?.theme));
  }
}
