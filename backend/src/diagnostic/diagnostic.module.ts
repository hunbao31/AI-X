import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticService } from './diagnostic.service';
import { PhobertSimilarityService } from './phobert-similarity.service';
import { ClassesModule } from '../classes/classes.module';
import { KnowledgeTracingModule } from '../knowledge-tracing/knowledge-tracing.module';

@Module({
  imports: [ClassesModule, KnowledgeTracingModule],
  controllers: [DiagnosticController],
  providers: [DiagnosticService, PhobertSimilarityService],
})
export class DiagnosticModule {}
