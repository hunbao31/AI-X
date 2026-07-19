import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const XP_CORRECT = 10;
const XP_INCORRECT = 3;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isConsecutiveDay(lastActiveDate: string, today: string): boolean {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return lastActiveDate === yesterday.toISOString().slice(0, 10);
}

// Prisma-backed now — was an in-memory Map through Step 10. Same streak
// semantics as before, just persisted, and wrapped in a transaction for
// the same read-modify-write reason as MasteryStore.
@Injectable()
export class GamificationStore {
  constructor(private readonly prisma: PrismaService) {}

  async getRecord(userId: string) {
    const existing = await this.prisma.gamification.findUnique({
      where: { userId },
    });
    return (
      existing ?? {
        userId,
        xp: 0,
        level: 0,
        streak: 0,
        lastActiveDate: null as string | null,
      }
    );
  }

  recordAttempt(userId: string, correct: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.gamification.findUnique({ where: { userId } });
      const today = todayKey();

      const xp = (existing?.xp ?? 0) + (correct ? XP_CORRECT : XP_INCORRECT);
      const level = Math.floor(xp / 100);

      let streak: number;
      if (existing?.lastActiveDate === today) {
        streak = existing.streak;
      } else if (
        existing?.lastActiveDate &&
        isConsecutiveDay(existing.lastActiveDate, today)
      ) {
        streak = existing.streak + 1;
      } else {
        streak = 1;
      }

      return tx.gamification.upsert({
        where: { userId },
        create: { userId, xp, level, streak, lastActiveDate: today },
        update: { xp, level, streak, lastActiveDate: today },
      });
    });
  }
}
