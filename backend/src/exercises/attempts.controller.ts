import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExercisesService } from './exercises.service';
import { AiService } from '../ai/ai.service';
import { MasteryStore } from '../mastery/mastery.store';
import { RecommendationService } from '../recommendation/recommendation.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GamificationService } from '../gamification/gamification.service';
import { ok, apiError } from '../common/api-envelope';

interface AttemptInput {
  exerciseId: string;
  topic: string;
  answer: string;
}

function errorEnvelope(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString() },
  };
}

@Controller('api/v1/attempts')
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly aiService: AiService,
    private readonly masteryStore: MasteryStore,
    private readonly recommendationService: RecommendationService,
    private readonly analyticsService: AnalyticsService,
    private readonly gamificationService: GamificationService,
  ) {}

  @Post()
  @HttpCode(201)
  async submit(
    @Body() body: AttemptInput,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!body?.exerciseId || !body?.topic || typeof body.answer !== 'string') {
      throw new HttpException(
        errorEnvelope(
          'VALIDATION_ERROR',
          'exerciseId, topic và answer là bắt buộc.',
        ),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Exercises are DB-backed now (teacher-created) instead of the static
    // curriculum array — CurriculumModule/`/curriculum` still exist for the
    // old grade/topic browsing page, but attempts no longer depend on them.
    const exercise = await this.exercisesService.findOne(body.exerciseId, req.user);

    if (!exercise || exercise.topic !== body.topic) {
      throw new HttpException(
        errorEnvelope(
          'EXERCISE_NOT_FOUND',
          'Bài tập không tồn tại trong chủ đề này.',
        ),
        HttpStatus.NOT_FOUND,
      );
    }

    // Tu luan la do giao vien cham, khong phai AI -- ghi nhan cau tra loi
    // roi dung lai, cho toi khi giao vien duyet (xem review() ben duoi).
    // Khong tinh mastery/XP ngay vi chua biet dung/sai.
    if (exercise.type === 'text') {
      await this.analyticsService.recordPendingAttempt(
        req.user.sub,
        exercise.id,
        body.topic,
        body.answer,
      );
      return ok({ needsTeacherReview: true });
    }

    const evaluation = await this.aiService.evaluateAnswer(
      exercise.question,
      body.answer,
      exercise.answer,
    );

    const mastery = await this.masteryStore.recordAttempt(
      req.user.sub,
      body.topic,
      evaluation.understandingLevel,
      exercise.topicId,
    );

    const recommendation = this.recommendationService.getRecommendation(
      mastery.score,
    );

    await this.analyticsService.recordAttempt(
      req.user.sub,
      exercise.id,
      body.topic,
      body.answer,
      evaluation.correct,
      evaluation.understandingLevel,
    );

    const gamification = await this.gamificationService.recordAttempt(
      req.user.sub,
      evaluation.correct,
    );

    return {
      success: true,
      data: {
        ...evaluation,
        mastery: { score: mastery.score, attempts: mastery.attempts },
        recommendation,
        gamification,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // Danh sach cau tu luan cua CHINH giao vien nay (Exercise.createdBy) dang
  // cho duyet -- khong theo lop, vi cau hoi tao qua "Tao de" khong bat buoc
  // gan lop.
  @Get('pending-review')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async pendingReview(@Req() req: { user: AuthenticatedUser }) {
    return ok(await this.analyticsService.getPendingReviewForTeacher(req.user.sub));
  }

  // Giao vien duyet TOAN BO hoc sinh dang cho duyet 1 cau hoi cung luc --
  // 1 verdict dung/sai + 1 nhan xet ap dung chung ca nhom, roi moi tinh
  // mastery + XP cho tung hoc sinh (bi hoan lai luc submit vi chua co ket
  // qua). Do thoi gian cham cho giao vien khi nhieu hoc sinh cung tra loi
  // 1 cau.
  @Post('review-group')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async reviewGroup(
    @Body() body: { exerciseId?: string; correct?: boolean; comment?: string },
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!body?.exerciseId || typeof body.correct !== 'boolean') {
      throw apiError(
        'VALIDATION_ERROR',
        'exerciseId và correct là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const group = await this.analyticsService.getGroupForReview(body.exerciseId);
    if (!group || group.attempts.length === 0) {
      throw apiError(
        'GROUP_NOT_FOUND',
        'Không còn câu trả lời nào đang chờ duyệt cho câu hỏi này.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (req.user.role !== 'admin' && group.exercise.createdBy !== req.user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Bạn chỉ có thể duyệt câu hỏi do mình tạo.',
        HttpStatus.FORBIDDEN,
      );
    }

    const comment = body.comment?.trim() || null;
    await this.analyticsService.applyGroupReview(
      group.attempts.map((a) => a.id),
      body.correct,
      comment,
      req.user.sub,
    );

    const understandingLevel = body.correct ? 'HIGH' : 'LOW';
    for (const attempt of group.attempts) {
      await this.masteryStore.recordAttempt(
        attempt.userId,
        attempt.topic,
        understandingLevel,
        group.exercise.topicId,
      );
      await this.gamificationService.recordAttempt(attempt.userId, body.correct);
    }

    return ok({ exerciseId: body.exerciseId, correct: body.correct, reviewedCount: group.attempts.length });
  }
}
