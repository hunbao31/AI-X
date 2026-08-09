import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ClassesModule } from '../classes/classes.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [ClassesModule, GamificationModule],
  controllers: [ForumController],
  providers: [ForumService],
})
export class ForumModule {}
