import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { SetsService } from './sets.service';
import {
  AddExerciseToSetDto,
  CheckAnswerDto,
  CreateSetDto,
  DuplicateSetDto,
  QuickSubmitDto,
  SaveProgressDto,
  StartAttemptDto,
  SubmitSetDto,
  UpdateSetDto,
} from './dto/set.dto';
import { ok } from '../common/api-envelope';

@Controller('api/v1/sets')
@UseGuards(JwtAuthGuard)
export class SetsController {
  constructor(private readonly setsService: SetsService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async create(@Body() dto: CreateSetDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.setsService.createSet(req.user, dto));
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const sets = await this.setsService.listVisible(req.user);
    return ok(sets, { count: sets.length });
  }

  // Literal routes must precede ':id' matches.

  // Stateless random quiz: random topic, difficulty-scaled random questions.
  @Post('quick-start')
  @HttpCode(200)
  async quickStart(@Req() req: AuthenticatedRequest) {
    return ok(await this.setsService.quickStart(req.user));
  }

  @Post('quick-start/submit')
  @HttpCode(201)
  async quickSubmit(@Body() dto: QuickSubmitDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.setsService.quickSubmit(req.user, dto));
  }

  // "Have a quiz code?" — resolve a private access code to its set.
  @Get('by-code/:code')
  async byCode(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.setsService.findByCode(code, req.user));
  }

  // Auto-save from the quiz player (fire-and-forget).
  @Patch('attempts/:attemptId/progress')
  async saveProgress(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveProgressDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.saveProgress(attemptId, req.user, dto));
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('code') code?: string,
  ) {
    return ok(await this.setsService.getDetail(id, req.user, code));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.updateSet(id, req.user, dto));
  }

  @Post(':id/add-exercise')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async addExercise(
    @Param('id') id: string,
    @Body() dto: AddExerciseToSetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.addExercise(id, req.user, dto?.exerciseId));
  }

  @Delete(':id/exercises/:exerciseId')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async removeExercise(
    @Param('id') id: string,
    @Param('exerciseId') exerciseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.removeExercise(id, req.user, exerciseId));
  }

  // Instant feedback while playing a practice-mode quiz (403 in exam mode).
  @Post(':id/check')
  @HttpCode(200)
  async check(
    @Param('id') id: string,
    @Body() dto: CheckAnswerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(
      await this.setsService.checkAnswer(
        id,
        req.user,
        dto?.exerciseId,
        dto?.answer,
        dto?.code,
      ),
    );
  }

  // Creates or resumes the in-progress attempt (auto-save/resume anchor).
  @Post(':id/start')
  @HttpCode(200)
  async start(
    @Param('id') id: string,
    @Body() dto: StartAttemptDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.startAttempt(id, req.user, dto?.code));
  }

  // Students submit a full run of the set; grading is server-side.
  @Post(':id/submit')
  @HttpCode(201)
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitSetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.submit(id, req.user, dto));
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicateSetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.setsService.duplicate(id, req.user, dto ?? {}));
  }

  // Raw CSV download (same columns the importer accepts).
  @Get(':id/export')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.setsService.exportCsv(id, req.user);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Get(':id/leaderboard')
  async leaderboard(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('code') code?: string,
  ) {
    const entries = await this.setsService.leaderboard(id, req.user, code);
    return ok(entries, { count: entries.length });
  }
}
