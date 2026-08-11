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
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly notificationsService: NotificationsService,
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
    const verdictLabel = body.correct ? 'Đúng' : 'Sai';
    const notifMessage = comment
      ? `Câu tự luận "${group.exercise.question}" đã được chấm: ${verdictLabel}. Nhận xét: ${comment}`
      : `Câu tự luận "${group.exercise.question}" đã được chấm: ${verdictLabel}.`;
    for (const attempt of group.attempts) {
      await this.masteryStore.recordAttempt(
        attempt.userId,
        attempt.topic,
        understandingLevel,
        group.exercise.topicId,
      );
      await this.gamificationService.recordAttempt(attempt.userId, body.correct);
      await this.notificationsService.create(attempt.userId, 'essay_reviewed', notifMessage, '/history');
    }

    return ok({ exerciseId: body.exerciseId, correct: body.correct, reviewedCount: group.attempts.length });
  }

  // Lich su cac lan da duyet, cua CHINH giao vien nay -- de xem lai va sua
  // neu can (xem editReviewGroup ben duoi).
  @Get('reviewed')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async reviewed(@Req() req: { user: AuthenticatedUser }) {
    return ok(await this.analyticsService.getReviewedGroupsForTeacher(req.user.sub));
  }

  // Sua lai mot lan duyet da co (doi dung/sai va/hoac nhan xet). Chi doi
  // ban ghi danh gia -- mastery/XP da cong luc duyet dau GIU NGUYEN, xem
  // ghi chu o AnalyticsService.editGroupReview vi sao khong hoan tac duoc
  // chinh xac. Hoc sinh bi anh huong se nhan them 1 thong bao ve thay doi.
  @Post('review-group/edit')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async editReviewGroup(
    @Body() body: { attemptIds?: string[]; correct?: boolean; comment?: string },
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!Array.isArray(body?.attemptIds) || body.attemptIds.length === 0 || typeof body.correct !== 'boolean') {
      throw apiError(
        'VALIDATION_ERROR',
        'attemptIds và correct là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const rows = await this.analyticsService.getAttemptsForEdit(body.attemptIds);
    if (rows.length === 0) {
      throw apiError('ATTEMPT_NOT_FOUND', 'Không tìm thấy lượt làm bài nào để sửa.', HttpStatus.NOT_FOUND);
    }
    for (const row of rows) {
      if (req.user.role !== 'admin' && row.exercise.createdBy !== req.user.sub) {
        throw apiError('FORBIDDEN', 'Bạn chỉ có thể sửa câu hỏi do mình tạo.', HttpStatus.FORBIDDEN);
      }
    }

    const comment = body.comment?.trim() || null;
    await this.analyticsService.editGroupReview(body.attemptIds, body.correct, comment);

    const verdictLabel = body.correct ? 'Đúng' : 'Sai';
    const question = rows[0].exercise.question;
    const notifMessage = comment
      ? `Câu tự luận "${question}" vừa được giáo viên sửa lại kết quả: ${verdictLabel}. Nhận xét: ${comment}`
      : `Câu tự luận "${question}" vừa được giáo viên sửa lại kết quả: ${verdictLabel}.`;
    for (const row of rows) {
      await this.notificationsService.create(row.userId, 'essay_reviewed', notifMessage, '/history');
    }

    return ok({ updated: rows.length });
  }

  // Lich su tu luan cua CHINH hoc sinh dang dang nhap -- ca dang cho va da
  // duyet, de biet minh dung/sai va doc nhan xet cua giao vien.
  @Get('mine')
  async mine(@Req() req: { user: AuthenticatedUser }) {
    return ok(await this.analyticsService.getMyTextAttempts(req.user.sub));
  }
}
