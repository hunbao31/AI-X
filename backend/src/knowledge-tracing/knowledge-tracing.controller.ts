import { Body, Controller, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { apiError, ok } from '../common/api-envelope';
import { KnowledgeTracingService } from './knowledge-tracing.service';
import { ClassStudentInput, InteractionTuple } from './knowledge-tracing.types';

interface PredictStudentDto {
  interactions?: InteractionTuple[];
}

interface PredictClassDto {
  students?: ClassStudentInput[];
}

function isValidInteractions(value: unknown): value is InteractionTuple[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        typeof item[0] === 'string' &&
        item[0].trim() !== '' &&
        (item[1] === 0 || item[1] === 1),
    )
  );
}

function isValidStudents(value: unknown): value is ClassStudentInput[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as ClassStudentInput).id === 'string' &&
        (item as ClassStudentInput).id.trim() !== '' &&
        isValidInteractions((item as ClassStudentInput).interactions),
    )
  );
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class KnowledgeTracingController {
  constructor(
    private readonly knowledgeTracingService: KnowledgeTracingService,
  ) {}

  // :id identifies which student the prediction belongs to (echoed back in
  // meta for the caller/logs). The interaction history itself comes from the
  // request body rather than being re-derived from Attempt records here —
  // there's no established mapping yet from this app's Exercise rows to the
  // model's free-text "ten_bai_tap" identifiers.
  @Post('hoc-sinh/:id/du-doan')
  async predictStudent(@Param('id') id: string, @Body() dto: PredictStudentDto) {
    if (!isValidInteractions(dto?.interactions)) {
      throw apiError(
        'VALIDATION_ERROR',
        'interactions là bắt buộc và phải là mảng các cặp [ten_bai_tap, 0|1].',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const steps = await this.knowledgeTracingService.predictStudent(
      dto.interactions,
    );
    return ok(steps, { studentId: id, count: steps.length });
  }

  @Post('lop/bao-cao')
  async predictClass(@Body() dto: PredictClassDto) {
    if (!isValidStudents(dto?.students)) {
      throw apiError(
        'VALIDATION_ERROR',
        'students là bắt buộc; mỗi học sinh cần id và interactions hợp lệ.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const topics = await this.knowledgeTracingService.predictClass(
      dto.students,
    );
    return ok(topics, { count: topics.length });
  }
}
