import { Module } from '@nestjs/common';
import { SetsController } from './sets.controller';
import { SetsService } from './sets.service';
import { ClassesModule } from '../classes/classes.module';
import { MasteryModule } from '../mastery/mastery.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GamificationModule } from '../gamification/gamification.module';
import { ExercisesModule } from '../exercises/exercises.module';

@Module({
  imports: [
    ClassesModule,
    MasteryModule,
    AnalyticsModule,
    GamificationModule,
    ExercisesModule,
  ],
  controllers: [SetsController],
  providers: [SetsService],
  exports: [SetsService],
})
export class SetsModule {}
