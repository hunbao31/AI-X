import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const XP_CORRECT = 10;
const XP_INCORRECT = 3;

type DbClient = PrismaService | Prisma.TransactionClient;

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

  // xpOverride lets callers award boosted/custom XP (quiz speed/combo
  // bonuses, forum rewards) while the plain flow keeps the flat +10/+3.
  //
  // `tx` lets a caller that's already inside its own transaction (e.g. the
  // forum service granting XP + bumping a denormalized counter atomically)
  // pass its client through instead of opening a nested transaction — Prisma
  // has no true nested-transaction support, so when `tx` is given we just run
  // the read-modify-write directly against it. Existing call sites that pass
  // no `tx` are unaffected: this still opens its own transaction exactly as
  // before.
  recordAttempt(
    userId: string,
    correct: boolean,
    xpOverride?: number,
    tx?: Prisma.TransactionClient,
  ) {
    const apply = async (client: DbClient) => {
      const existing = await client.gamification.findUnique({ where: { userId } });
      const today = todayKey();

      const gained = xpOverride ?? (correct ? XP_CORRECT : XP_INCORRECT);
      const xp = (existing?.xp ?? 0) + gained;
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

      return client.gamification.upsert({
        where: { userId },
        create: { userId, xp, level, streak, lastActiveDate: today },
        update: { xp, level, streak, lastActiveDate: today },
      });
    };

    if (tx) return apply(tx);
    return this.prisma.$transaction((txClient) => apply(txClient));
  }

  // Adjusts XP by a signed delta without touching streak/lastActiveDate —
  // for corrections (e.g. retracting a mistaken upvote's +5) that shouldn't
  // read as a fresh "did something today" activity. Floors at 0.
  adjustXp(userId: string, delta: number, tx?: Prisma.TransactionClient) {
    const apply = async (client: DbClient) => {
      const existing = await client.gamification.findUnique({ where: { userId } });
      const xp = Math.max(0, (existing?.xp ?? 0) + delta);
      const level = Math.floor(xp / 100);

      return client.gamification.upsert({
        where: { userId },
        create: { userId, xp, level, streak: 0, lastActiveDate: null },
        update: { xp, level },
      });
    };

    if (tx) return apply(tx);
    return this.prisma.$transaction((txClient) => apply(txClient));
  }
}
