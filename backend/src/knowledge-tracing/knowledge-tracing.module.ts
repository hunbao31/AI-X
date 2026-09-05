import { Module } from '@nestjs/common';
import { KnowledgeTracingController } from './knowledge-tracing.controller';
import { KnowledgeTracingService } from './knowledge-tracing.service';
import { ClassesModule } from '../classes/classes.module';

@Module({
  controllers: [KnowledgeTracingController],
  imports: [ClassesModule],
  providers: [KnowledgeTracingService],
  exports: [KnowledgeTracingService],
})
export class KnowledgeTracingModule {}
