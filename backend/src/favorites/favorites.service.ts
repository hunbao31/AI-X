import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { apiError } from '../common/api-envelope';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const favorites = await this.prisma.favoriteQuestion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { exercise: true },
    });
    return favorites.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      exercise: f.exercise,
    }));
  }

  // Idempotent — favoriting twice is a no-op, not an error.
  async add(userId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true },
    });
    if (!exercise) {
      throw apiError('EXERCISE_NOT_FOUND', 'Question does not exist.', HttpStatus.NOT_FOUND);
    }

    await this.prisma.favoriteQuestion.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: { userId, exerciseId },
      update: {},
    });
    return { exerciseId, favorited: true };
  }

  async remove(userId: string, exerciseId: string) {
    await this.prisma.favoriteQuestion.deleteMany({
      where: { userId, exerciseId },
    });
    return { exerciseId, favorited: false };
  }

  async listIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.favoriteQuestion.findMany({
      where: { userId },
      select: { exerciseId: true },
    });
    return rows.map((r) => r.exerciseId);
  }
}
