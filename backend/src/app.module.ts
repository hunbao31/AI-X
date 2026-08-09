import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { TopicsModule } from './topics/topics.module';
import { ExercisesModule } from './exercises/exercises.module';
import { SetsModule } from './sets/sets.module';
import { MasteryModule } from './mastery/mastery.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GamificationModule } from './gamification/gamification.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ForumModule } from './forum/forum.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { KnowledgeTracingModule } from './knowledge-tracing/knowledge-tracing.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    TopicsModule,
    CurriculumModule,
    ExercisesModule,
    SetsModule,
    MasteryModule,
    RecommendationModule,
    AnalyticsModule,
    GamificationModule,
    LeaderboardModule,
    FavoritesModule,
    ForumModule,
    KnowledgeTracingModule,
    DiagnosticModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
