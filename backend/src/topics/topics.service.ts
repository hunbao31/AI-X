import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
  ) {}

  async create(user: AuthenticatedUser, name: string, classId: string) {
    if (!name?.trim() || !classId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'name và classId là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.classesService.assertTeacherOf(classId, user);

    const existing = await this.prisma.topic.findUnique({
      where: { classId_name: { classId, name: name.trim() } },
    });
    if (existing) {
      throw apiError(
        'TOPIC_ALREADY_EXISTS',
        'Lớp học này đã có một chủ đề với tên đó.',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.topic.create({
      data: { name: name.trim(), classId },
      include: { _count: { select: { exercises: true } } },
    });
  }

  async listByClass(user: AuthenticatedUser, classId: string) {
    if (!classId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'Tham số classId là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.classesService.assertMember(classId, user);

    return this.prisma.topic.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { exercises: true } } },
    });
  }

  async findById(topicId: string) {
    return this.prisma.topic.findUnique({ where: { id: topicId } });
  }
}
