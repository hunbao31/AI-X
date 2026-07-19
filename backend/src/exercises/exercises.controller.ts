import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';

@Controller('api/v1/exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  // Teacher-only: creating content. Enforced here too, not just in the
  // frontend route guard, since the frontend guard is trivially bypassed
  // by calling the API directly.
  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async create(
    @Body() dto: CreateExerciseDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const exercise = await this.exercisesService.create(dto, req.user.sub);
    return {
      success: true,
      data: exercise,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // Open to both roles — students need this to practice.
  @Get()
  async findAll(@Query('topic') topic?: string) {
    const exercises = await this.exercisesService.findAll(topic);
    return {
      success: true,
      data: exercises,
      meta: { timestamp: new Date().toISOString(), count: exercises.length },
    };
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getStats(@Req() req: { user: AuthenticatedUser }) {
    const stats = await this.exercisesService.getTeacherStats(req.user.sub);
    return {
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async remove(@Param('id') id: string) {
    const result = await this.exercisesService.remove(id);
    return {
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
