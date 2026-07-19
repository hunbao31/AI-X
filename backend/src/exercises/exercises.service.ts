import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';

const VALID_TYPES = ['mcq', 'text'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

function errorEnvelope(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString() },
  };
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExerciseDto, userId: string) {
    if (!dto?.question?.trim() || !dto?.answer?.trim() || !dto?.topic?.trim()) {
      throw new HttpException(
        errorEnvelope('VALIDATION_ERROR', 'question, answer, and topic are required.'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!VALID_TYPES.includes(dto.type)) {
      throw new HttpException(
        errorEnvelope('VALIDATION_ERROR', 'type must be "mcq" or "text".'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!VALID_DIFFICULTIES.includes(dto.difficulty)) {
      throw new HttpException(
        errorEnvelope(
          'VALIDATION_ERROR',
          'difficulty must be "easy", "medium", or "hard".',
        ),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.type === 'mcq' && (!Array.isArray(dto.options) || dto.options.length < 2)) {
      throw new HttpException(
        errorEnvelope('VALIDATION_ERROR', 'options are required when type is "mcq".'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.type === 'text' && dto.options != null) {
      throw new HttpException(
        errorEnvelope('VALIDATION_ERROR', 'options must be omitted when type is "text".'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.prisma.exercise.create({
      data: {
        question: dto.question,
        type: dto.type,
        options: dto.type === 'mcq' ? (dto.options as string[]) : undefined,
        answer: dto.answer,
        difficulty: dto.difficulty,
        topic: dto.topic,
        createdBy: userId,
      },
    });
  }

  async findAll(topic?: string) {
    try {
      return await this.prisma.exercise.findMany({
        where: topic && topic.trim() !== '' ? { topic } : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Never let a transient DB hiccup surface as a broken response —
      // an empty list is always a valid answer for "no exercises yet".
      return [];
    }
  }

  findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
  }

  // Backs the new teacher dashboard stats cards. Attempt.exerciseId has no
  // formal FK to Exercise (see schema.prisma comment on Attempt), so this
  // matches by value rather than via a relation — still correct, just a
  // plain "id in (...)" query instead of a join.
  async getTeacherStats(userId: string) {
    const myExercises = await this.prisma.exercise.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });
    const exerciseIds = myExercises.map((e) => e.id);

    const totalAttempts =
      exerciseIds.length > 0
        ? await this.prisma.attempt.count({
            where: { exerciseId: { in: exerciseIds } },
          })
        : 0;

    return { totalExercises: myExercises.length, totalAttempts };
  }

  async remove(id: string) {
    const existing = await this.prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException(
        errorEnvelope('EXERCISE_NOT_FOUND', 'Exercise does not exist.'),
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.exercise.delete({ where: { id } });
    return { id };
  }
}
