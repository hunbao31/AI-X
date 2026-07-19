import { Module } from '@nestjs/common';
import { MasteryController } from './mastery.controller';
import { MasteryStore } from './mastery.store';

@Module({
  controllers: [MasteryController],
  providers: [MasteryStore],
  exports: [MasteryStore],
})
export class MasteryModule {}
