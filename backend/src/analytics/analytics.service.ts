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

export interface TopicAnalytics {
  topic: string;
  attempts: number;
  correct: number;
  correctRate: number;
  masteryScore: number;
}

export interface QuestionAnalytics {
  exerciseId: string;
  question: string;
  topic: string;
  attempts: number;
  correct: number;
  correctRate: number;
}

export interface SetAnalytics {
  setId: string;
  title: string;
  attempts: number;
  avgScore: number;
  avgDurationSeconds: number | null;
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

  // Per-topic correct rate + attempts, joined with mastery scores. Backs the
  // student dashboard breakdown and topic recommendations.
  async getTopicBreakdown(userId: string): Promise<TopicAnalytics[]> {
    const [totals, corrects, masteryRecords] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['topic'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.attempt.groupBy({
        by: ['topic'],
        where: { userId, correct: true },
        _count: { _all: true },
      }),
      this.masteryStore.findAllByUser(userId),
    ]);

    const correctByTopic = new Map(corrects.map((c) => [c.topic, c._count._all]));
    const masteryByTopic = new Map(masteryRecords.map((m) => [m.topic, m.score]));

    return totals
      .map((t) => {
        const attempts = t._count._all;
        const correct = correctByTopic.get(t.topic) ?? 0;
        return {
          topic: t.topic,
          attempts,
          correct,
          correctRate: attempts > 0 ? round2((correct / attempts) * 100) : 0,
          masteryScore: masteryByTopic.get(t.topic) ?? 0,
        };
      })
      .sort((a, b) => a.correctRate - b.correctRate);
  }

  // Teacher view: per-question correct rate across MY exercises, hardest
  // (most-missed) first.
  async getQuestionBreakdown(teacherId: string): Promise<QuestionAnalytics[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { createdBy: teacherId },
      select: { id: true, question: true, topic: true },
    });
    if (exercises.length === 0) return [];
    const ids = exercises.map((e) => e.id);

    const [totals, corrects] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['exerciseId'],
        where: { exerciseId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.attempt.groupBy({
        by: ['exerciseId'],
        where: { exerciseId: { in: ids }, correct: true },
        _count: { _all: true },
      }),
    ]);

    const totalById = new Map(totals.map((t) => [t.exerciseId, t._count._all]));
    const correctById = new Map(corrects.map((c) => [c.exerciseId, c._count._all]));

    return exercises
      .map((e) => {
        const attempts = totalById.get(e.id) ?? 0;
        const correct = correctById.get(e.id) ?? 0;
        return {
          exerciseId: e.id,
          question: e.question,
          topic: e.topic,
          attempts,
          correct,
          correctRate: attempts > 0 ? round2((correct / attempts) * 100) : 0,
        };
      })
      .filter((e) => e.attempts > 0)
      .sort((a, b) => a.correctRate - b.correctRate || b.attempts - a.attempts)
      .slice(0, 20);
  }

  // Teacher view: avg score + avg time per quiz set I own.
  async getSetBreakdown(teacherId: string): Promise<SetAnalytics[]> {
    const sets = await this.prisma.exerciseSet.findMany({
      where: { createdBy: teacherId },
      select: { id: true, title: true },
    });
    if (sets.length === 0) return [];

    const aggregates = await this.prisma.quizAttempt.groupBy({
      by: ['setId'],
      where: { setId: { in: sets.map((s) => s.id) }, completedAt: { not: null } },
      _count: { _all: true },
      _avg: { score: true, durationSeconds: true },
    });
    const bySet = new Map(aggregates.map((a) => [a.setId, a]));

    return sets
      .map((s) => {
        const agg = bySet.get(s.id);
        return {
          setId: s.id,
          title: s.title,
          attempts: agg?._count._all ?? 0,
          avgScore: agg?._avg.score !== null && agg !== undefined ? round2(agg._avg.score ?? 0) : 0,
          avgDurationSeconds:
            agg?._avg.durationSeconds !== null && agg?._avg.durationSeconds !== undefined
              ? round2(agg._avg.durationSeconds)
              : null,
        };
      })
      .sort((a, b) => b.attempts - a.attempts);
  }
}
