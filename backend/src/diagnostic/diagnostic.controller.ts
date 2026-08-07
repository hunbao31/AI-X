import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { DiagnosticService } from './diagnostic.service';
import {
  CreateDiagnosticExerciseDto,
  ImportDiagnosticExercisesDto,
} from './dto/create-diagnostic-exercise.dto';
import { SubmitDiagnosticAnswerDto } from './dto/submit-diagnostic-answer.dto';
import { ReviewAttemptDto } from './dto/review-attempt.dto';
import { apiError, ok } from '../common/api-envelope';

@Controller('api/v1/diagnostic')
@UseGuards(JwtAuthGuard)
export class DiagnosticController {
  constructor(private readonly diagnosticService: DiagnosticService) {}

  // Teacher-only: this powers the drag-and-drop skill catalog authoring UI,
  // not a student-facing view.
  @Get('skill-catalog')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getSkillCatalog() {
    return ok(await this.diagnosticService.getSkillCatalog());
  }

  // Student-facing: only chuong/bai that already have at least 1 question.
  @Get('catalog')
  async getStudentCatalog() {
    return ok(await this.diagnosticService.getStudentCatalog());
  }

  @Get('bai/:baiSgk/questions')
  async getBaiQuestions(@Param('baiSgk') baiSgk: string) {
    const n = Number(baiSgk);
    if (!Number.isInteger(n) || n <= 0) {
      throw apiError(
        'VALIDATION_ERROR',
        'baiSgk không hợp lệ.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const questions = await this.diagnosticService.getBaiQuestions(n);
    return ok(questions, { count: questions.length });
  }

  @Get('skills/:skillCode/exercises')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getSkillExercises(@Param('skillCode') skillCode: string) {
    const exercises = await this.diagnosticService.getSkillExercises(skillCode);
    return ok(exercises, { count: exercises.length });
  }

  @Post('exercises')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async createExercise(
    @Body() dto: CreateDiagnosticExerciseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.diagnosticService.createExercise(dto, req.user));
  }

  // Nhap hang loat cau hoi trac nghiem (CSV) cho 1 skillCode co dinh.
  @Post('exercises/import')
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async importExercises(
    @Body() dto: ImportDiagnosticExercisesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.diagnosticService.importExercises(dto, req.user));
  }

  @Post('attempts')
  @HttpCode(201)
  async submitAnswer(
    @Body() dto: SubmitDiagnosticAnswerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.diagnosticService.submitAnswer(dto, req.user));
  }

  // Bao cao AI (Knowledge Tracing) cho ca lop -- chi giao vien cua lop do.
  @Get('classes/:classId/report')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getClassReport(
    @Param('classId') classId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const topics = await this.diagnosticService.getClassReport(classId, req.user);
    return ok(topics, { count: topics.length });
  }

  // Bao cao AI theo TUNG hoc sinh trong lop -- chi giao vien cua lop do.
  @Get('classes/:classId/students-report')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getClassStudentReports(
    @Param('classId') classId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const reports = await this.diagnosticService.getClassStudentReports(classId, req.user);
    return ok(reports, { count: reports.length });
  }

  // Bao cao AI cho chinh hoc sinh dang dang nhap.
  @Get('me/report')
  async getMyReport(@Req() req: AuthenticatedRequest) {
    const steps = await this.diagnosticService.getMyReport(req.user);
    return ok(steps, { count: steps.length });
  }

  // Danh sach cau tu_luan cho duyet cua 1 lop -- chi giao vien cua lop do.
  @Get('classes/:classId/pending-review')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async getPendingReview(
    @Param('classId') classId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const items = await this.diagnosticService.getPendingReview(classId, req.user);
    return ok(items, { count: items.length });
  }

  // Giao vien duyet 1 cau tu_luan.
  @Post('attempts/:attemptId/review')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async reviewAttempt(
    @Param('attemptId') attemptId: string,
    @Body() dto: ReviewAttemptDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (typeof dto?.correct !== 'boolean') {
      throw apiError(
        'VALIDATION_ERROR',
        'correct (boolean) là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.diagnosticService.reviewAttempt(attemptId, dto.correct, req.user);
    return ok({ success: true });
  }
}
