import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/topic.dto';
import { ok } from '../common/api-envelope';

@Controller('api/v1/topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async create(@Body() dto: CreateTopicDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.topicsService.create(req.user, dto?.name, dto?.classId));
  }

  @Get()
  async listByClass(
    @Query('classId') classId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const topics = await this.topicsService.listByClass(req.user, classId);
    return ok(topics, { count: topics.length });
  }
}
