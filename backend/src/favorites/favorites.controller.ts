import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { FavoritesService } from './favorites.service';
import { ok } from '../common/api-envelope';

@Controller('api/v1/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const favorites = await this.favoritesService.list(req.user.sub);
    return ok(favorites, { count: favorites.length });
  }

  // Lightweight id list for toggling stars without pulling full questions.
  @Get('ids')
  async listIds(@Req() req: AuthenticatedRequest) {
    const ids = await this.favoritesService.listIds(req.user.sub);
    return ok(ids, { count: ids.length });
  }

  @Post(':exerciseId')
  @HttpCode(201)
  async add(@Param('exerciseId') exerciseId: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.favoritesService.add(req.user.sub, exerciseId));
  }

  @Delete(':exerciseId')
  async remove(
    @Param('exerciseId') exerciseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.favoritesService.remove(req.user.sub, exerciseId));
  }
}
