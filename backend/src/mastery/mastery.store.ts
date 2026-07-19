import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UnderstandingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const SCORE_DELTA: Record<UnderstandingLevel, number> = {
  HIGH: 10,
  MEDIUM: 5,
  LOW: 1,
};

const MAX_SCORE = 100;

// Prisma-backed now — was an in-memory Map keyed by "userId::topic" through
// Step 10. The read-modify-write (score is capped, not a plain increment)
// runs inside a transaction so two concurrent attempts on the same topic
// can't read the same stale score and both apply their delta to it.
@Injectable()
export class MasteryStore {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUser(userId: string) {
    return this.prisma.mastery.findMany({ where: { userId } });
  }

  recordAttempt(
    userId: string,
    topic: string,
    understandingLevel: UnderstandingLevel,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.mastery.findUnique({
        where: { userId_topic: { userId, topic } },
      });

      const score = Math.min(
        MAX_SCORE,
        (existing?.score ?? 0) + SCORE_DELTA[understandingLevel],
      );
      const attempts = (existing?.attempts ?? 0) + 1;

      return tx.mastery.upsert({
        where: { userId_topic: { userId, topic } },
        create: { userId, topic, score, attempts },
        update: { score, attempts },
      });
    });
  }
}
