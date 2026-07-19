import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { GamificationStore } from './gamification.store';

@Module({
  controllers: [GamificationController],
  providers: [GamificationService, GamificationStore],
  exports: [GamificationService],
})
export class GamificationModule {}
