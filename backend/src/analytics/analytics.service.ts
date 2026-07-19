import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryStore } from '../mastery/mastery.store';

export interface AnalyticsSummary {
  totalAttempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageMastery: number;
}

type UnderstandingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Step 11: AnalyticsStore's in-memory counters are gone. Every attempt is
// now a real Attempt row (written here), and the summary is computed by
// querying that table directly rather than keeping a second, parallel
// counter that could drift from what's actually persisted.
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masteryStore: MasteryStore,
  ) {}

  async recordAttempt(
    userId: string,
    exerciseId: string,
    topic: string,
    answer: string,
    correct: boolean,
    understandingLevel: UnderstandingLevel,
  ): Promise<void> {
    await this.prisma.attempt.create({
      data: { userId, exerciseId, topic, answer, correct, understandingLevel },
    });
  }

  async getSummary(userId: string): Promise<AnalyticsSummary> {
    const [totalAttempts, correct] = await Promise.all([
      this.prisma.attempt.count({ where: { userId } }),
      this.prisma.attempt.count({ where: { userId, correct: true } }),
    ]);
    const incorrect = totalAttempts - correct;
    const accuracy =
      totalAttempts > 0 ? round2((correct / totalAttempts) * 100) : 0;

    const masteryRecords = await this.masteryStore.findAllByUser(userId);
    const averageMastery =
      masteryRecords.length > 0
        ? round2(
            masteryRecords.reduce((sum, r) => sum + r.score, 0) /
              masteryRecords.length,
          )
        : 0;

    return { totalAttempts, correct, incorrect, accuracy, averageMastery };
  }
}
