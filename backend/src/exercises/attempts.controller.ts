import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { ExercisesService } from './exercises.service';
import { AiService } from '../ai/ai.service';
import { MasteryStore } from '../mastery/mastery.store';
import { RecommendationService } from '../recommendation/recommendation.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GamificationService } from '../gamification/gamification.service';

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
}
