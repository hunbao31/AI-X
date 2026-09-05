import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ExercisesService } from './exercises.service';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  ImportExercisesDto,
  ImportExcelDto,
} from './dto/create-exercise.dto';
import { excelImportMulterOptions } from './excel-upload.config';
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

  // Bulk Excel (.xlsx) import — multipart, parsed server-side (see
  // excel-import.ts). Same destination fields as /import, sent as form
  // fields alongside the file.
  @Post('import-excel')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file', excelImportMulterOptions))
  async importExcel(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportExcelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu tệp Excel.');
    }
    return ok(await this.exercisesService.importExcel(file.buffer, dto, req.user));
  }

  // Open to both roles — students need this to practice. Doubles as the
  // searchable question bank for teachers. Results are visibility-filtered
  // per caller (see ExercisesService.findAll) — topic-linked exercises
  // outside the caller's own classes are excluded, not just hidden in the UI.
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('topic') topic?: string,
    @Query('topicId') topicId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const exercises = await this.exercisesService.findAll(
      { topic, topicId, difficulty, type, tag, search },
      req.user,
    );
    return ok(exercises, { count: exercises.length });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getStats(@Req() req: AuthenticatedRequest) {
    return ok(await this.exercisesService.getTeacherStats(req.user.sub));
  }

  // Personal question bank: only what the caller authored. Literal route —
  // must precede ':id' or "mine" would be parsed as an exercise id.
  @Get('mine')
  async findMine(
    @Req() req: AuthenticatedRequest,
    @Query('topic') topic?: string,
    @Query('topicId') topicId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const exercises = await this.exercisesService.findAll(
      { topic, topicId, difficulty, type, tag, search, createdBy: req.user.sub },
      req.user,
    );
    return ok(exercises, { count: exercises.length });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const exercise = await this.exercisesService.findOne(id, req.user);
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
