import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { MasteryModule } from '../mastery/mastery.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [MasteryModule, AnalyticsModule],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
