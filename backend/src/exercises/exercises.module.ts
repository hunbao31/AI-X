import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { AttemptsController } from './attempts.controller';
import { ExercisesService } from './exercises.service';
import { AiModule } from '../ai/ai.module';
import { MasteryModule } from '../mastery/mastery.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    AiModule,
    MasteryModule,
    RecommendationModule,
    AnalyticsModule,
    GamificationModule,
  ],
  controllers: [ExercisesController, AttemptsController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
