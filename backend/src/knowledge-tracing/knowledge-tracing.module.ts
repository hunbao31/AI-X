import { Module } from '@nestjs/common';
import { KnowledgeTracingController } from './knowledge-tracing.controller';
import { KnowledgeTracingService } from './knowledge-tracing.service';

@Module({
  controllers: [KnowledgeTracingController],
  providers: [KnowledgeTracingService],
  exports: [KnowledgeTracingService],
})
export class KnowledgeTracingModule {}
