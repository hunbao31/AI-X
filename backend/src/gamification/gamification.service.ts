import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GamificationStore } from './gamification.store';
import { PrismaService } from '../prisma/prisma.service';
import { Badge, computeBadges } from './badges';

export interface GamificationSummary {
  xp: number;
  level: number;
  streak: number;
}

export interface GamificationFullSummary extends GamificationSummary {
  badges: Badge[];
}

function toSummary(record: {
  xp: number;
  level: number;
  streak: number;
}): GamificationSummary {
  return { xp: record.xp, level: record.level, streak: record.streak };
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly gamificationStore: GamificationStore,
    private readonly prisma: PrismaService,
  ) {}

  async getSummary(userId: string): Promise<GamificationSummary> {
    return toSummary(await this.gamificationStore.getRecord(userId));
  }

  // Summary + computed badges (a few cheap count queries).
  async getFullSummary(userId: string): Promise<GamificationFullSummary> {
    const record = await this.gamificationStore.getRecord(userId);
    const [attempts, correct, quizzesCompleted, topics] = await Promise.all([
      this.prisma.attempt.count({ where: { userId } }),
      this.prisma.attempt.count({ where: { userId, correct: true } }),
      this.prisma.quizAttempt.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.attempt.groupBy({ by: ['topic'], where: { userId } }),
    ]);

    return {
      ...toSummary(record),
      badges: computeBadges({
        xp: record.xp,
        level: record.level,
        streak: record.streak,
        attempts,
        correct,
        quizzesCompleted,
        distinctTopics: topics.length,
      }),
    };
  }

  async recordAttempt(
    userId: string,
    correct: boolean,
    xpOverride?: number,
    tx?: Prisma.TransactionClient,
  ): Promise<GamificationSummary> {
    return toSummary(
      await this.gamificationStore.recordAttempt(userId, correct, xpOverride, tx),
    );
  }

  async adjustXp(
    userId: string,
    delta: number,
    tx?: Prisma.TransactionClient,
  ): Promise<GamificationSummary> {
    return toSummary(await this.gamificationStore.adjustXp(userId, delta, tx));
  }
}
