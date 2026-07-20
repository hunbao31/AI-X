import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ExercisesService } from './exercises.service';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  ImportExercisesDto,
} from './dto/create-exercise.dto';
import { ok } from '../common/api-envelope';

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
  async create(@Body() dto: CreateExerciseDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.exercisesService.create(dto, req.user));
  }

  // Bulk CSV import (question bank). The frontend reads the file client-side
  // and sends its text — no multipart parsing needed server-side.
  @Post('import')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async import(@Body() dto: ImportExercisesDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.exercisesService.import(dto, req.user));
  }

  // Open to both roles — students need this to practice. Doubles as the
  // searchable question bank for teachers.
  @Get()
  async findAll(
    @Query('topic') topic?: string,
    @Query('topicId') topicId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const exercises = await this.exercisesService.findAll({
      topic,
      topicId,
      difficulty,
      type,
      tag,
      search,
    });
    return ok(exercises, { count: exercises.length });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getStats(@Req() req: AuthenticatedRequest) {
    return ok(await this.exercisesService.getTeacherStats(req.user.sub));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const exercise = await this.exercisesService.findOne(id);
    return ok(exercise);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.exercisesService.update(id, dto, req.user));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.exercisesService.remove(id, req.user));
  }
}
