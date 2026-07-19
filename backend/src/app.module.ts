import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExercisesModule } from './exercises/exercises.module';
import { MasteryModule } from './mastery/mastery.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GamificationModule } from './gamification/gamification.module';
import { CurriculumModule } from './curriculum/curriculum.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CurriculumModule,
    ExercisesModule,
    MasteryModule,
    RecommendationModule,
    AnalyticsModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
