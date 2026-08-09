import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { MasteryStore } from './mastery.store';

@Controller('api/v1/mastery')
@UseGuards(JwtAuthGuard)
export class MasteryController {
  constructor(private readonly masteryStore: MasteryStore) {}

  @Get()
  async findAll(@Req() req: { user: AuthenticatedUser }) {
    const records = await this.masteryStore.findAllByUser(req.user.sub);

    return {
      success: true,
      data: records,
      meta: { timestamp: new Date().toISOString(), count: records.length },
    };
  }
}
