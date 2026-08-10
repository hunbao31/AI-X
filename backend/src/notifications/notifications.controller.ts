import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { ok } from '../common/api-envelope';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const [items, unreadCount] = await Promise.all([
      this.notificationsService.list(req.user.sub),
      this.notificationsService.unreadCount(req.user.sub),
    ]);
    return ok(items, { unreadCount });
  }

  @Post(':id/read')
  @HttpCode(200)
  async markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.notificationsService.markRead(req.user.sub, id);
    return ok({ id });
  }

  @Post('read-all')
  @HttpCode(200)
  async markAllRead(@Req() req: AuthenticatedRequest) {
    await this.notificationsService.markAllRead(req.user.sub);
    return ok({});
  }
}
