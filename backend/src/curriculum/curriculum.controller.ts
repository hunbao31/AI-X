import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurriculumService } from './curriculum.service';

@Controller('api/v1/curriculum')
@UseGuards(JwtAuthGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  getCurriculum() {
    return {
      success: true,
      data: this.curriculumService.getAllGrades(),
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
