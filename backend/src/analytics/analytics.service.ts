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

export interface PendingReviewSubmission {
  attemptId: string;
  studentUsername: string;
  studentAnswer: string;
  createdAt: Date;
}

export interface PendingAttemptReviewGroup {
  exerciseId: string;
  question: string;
  correctAnswer: string;
  submissions: PendingReviewSubmission[];
}

export interface GroupForReview {
  exercise: { createdBy: string; topicId: string | null; question: string };
  // Chi nhung attempt CON dang cho duyet tai thoi diem doc -- neu 1 hoc
  // sinh vua nop them cau tra loi khac giua luc giao vien dang xem trang,
  // dong moi do se KHONG bi cuon vao lan duyet nay (doc lai truoc khi ap
  // dung, xem applyGroupReview).
  attempts: { id: string; userId: string; topic: string }[];
}

export interface ReviewedGroup {
  exerciseId: string;
  question: string;
  correctAnswer: string;
  correct: boolean;
  comment: string | null;
  reviewedAt: Date;
  submissions: { attemptId: string; studentUsername: string; studentAnswer: string }[];
}

export interface AttemptForEdit {
  id: string;
  userId: string;
  exercise: { createdBy: string; question: string };
}

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

  // Tu luan (type=text) khong duoc AI cham nua -- luu lai cho giao vien duyet
  // thay vi correct/understandingLevel ngay lap tuc. Khong dong gop vao
  // mastery/gamification cho toi khi duoc duyet (xem applyReview).
  async recordPendingAttempt(
    userId: string,
    exerciseId: string,
    topic: string,
    answer: string,
  ): Promise<void> {
    await this.prisma.attempt.create({
      data: { userId, exerciseId, topic, answer, needsTeacherReview: true },
    });
  }

  // Tat ca cau tu luan dang cho duyet, gioi han trong nhung Exercise do
  // chinh giao vien nay tao (khong theo lop, vi Exercise tao qua "Tao de"
  // khong bat buoc gan lop) -- gom theo exerciseId (cung 1 cau hoi) de giao
  // vien duyet 1 lan cho ca nhom thay vi tung dong rieng le (do thoi gian
  // cham). Nhom nao co bai nop cu nhat se len truoc.
  async getPendingReviewForTeacher(teacherId: string): Promise<PendingAttemptReviewGroup[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { createdBy: teacherId, type: 'text' },
      select: { id: true, question: true, answer: true },
    });
    if (exercises.length === 0) return [];
    const byId = new Map(exercises.map((e) => [e.id, e]));

    const attempts = await this.prisma.attempt.findMany({
      where: { exerciseId: { in: exercises.map((e) => e.id) }, needsTeacherReview: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        answer: true,
        exerciseId: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    });

    const groups = new Map<string, PendingAttemptReviewGroup>();
    for (const a of attempts) {
      let group = groups.get(a.exerciseId);
      if (!group) {
        group = {
          exerciseId: a.exerciseId,
          question: byId.get(a.exerciseId)?.question ?? '',
          correctAnswer: byId.get(a.exerciseId)?.answer ?? '',
          submissions: [],
        };
        groups.set(a.exerciseId, group);
      }
      group.submissions.push({
        attemptId: a.id,
        studentUsername: a.user.username,
        studentAnswer: a.answer,
        createdAt: a.createdAt,
      });
    }
    // Nhom co bai nop cu nhat len truoc (theo submission dau tien cua nhom).
    return [...groups.values()].sort(
      (x, y) => x.submissions[0].createdAt.getTime() - y.submissions[0].createdAt.getTime(),
    );
  }

  // Attempt khong co quan he Prisma toi Exercise (chi luu exerciseId roi),
  // nen ghep thu cong o day thay vi include -- controller dung ket qua nay
  // de kiem tra quyen so huu (exercise.createdBy) truoc khi cho duyet.
  async getGroupForReview(exerciseId: string): Promise<GroupForReview | null> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { createdBy: true, topicId: true, question: true },
    });
    if (!exercise) return null;

    const attempts = await this.prisma.attempt.findMany({
      where: { exerciseId, needsTeacherReview: true },
      select: { id: true, userId: true, topic: true },
    });

    return { exercise, attempts };
  }

  // Duyet ca nhom cung luc -- dung/sai + nhan xet ap dung cho TOAN BO hoc
  // sinh dang cho duyet cau hoi nay tai thoi diem goi (chi id da doc o
  // getGroupForReview, tranh cuon vao bai nop moi sau khi giao vien da xem).
  async applyGroupReview(
    attemptIds: string[],
    correct: boolean,
    comment: string | null,
    reviewerId: string,
  ): Promise<void> {
    await this.prisma.attempt.updateMany({
      where: { id: { in: attemptIds } },
      data: {
        correct,
        understandingLevel: correct ? 'HIGH' : 'LOW',
        teacherComment: comment,
        needsTeacherReview: false,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      },
    });
  }

  // Lich su da duyet -- gom theo (exerciseId, reviewedAt) vi mot lan bam
  // Dung/Sai o applyGroupReview/editGroupReview ghi CUNG MOT gia tri
  // reviewedAt cho ca nhom (mot Date() duoc tinh 1 lan roi dung cho ca
  // updateMany), nen cap do nay chinh la ranh gioi tu nhien cua "1 lan
  // duyet", ke ca khi cung 1 cau hoi duoc duyet nhieu dot khac nhau (hoc
  // sinh nop lai sau) hoac duoc sua lai (xem editGroupReview).
  async getReviewedGroupsForTeacher(teacherId: string): Promise<ReviewedGroup[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { createdBy: teacherId, type: 'text' },
      select: { id: true, question: true, answer: true },
    });
    if (exercises.length === 0) return [];
    const byId = new Map(exercises.map((e) => [e.id, e]));

    const attempts = await this.prisma.attempt.findMany({
      where: {
        exerciseId: { in: exercises.map((e) => e.id) },
        needsTeacherReview: false,
        reviewedBy: { not: null },
      },
      orderBy: { reviewedAt: 'desc' },
      select: {
        id: true,
        answer: true,
        exerciseId: true,
        correct: true,
        teacherComment: true,
        reviewedAt: true,
        user: { select: { username: true } },
      },
    });

    const groups = new Map<string, ReviewedGroup>();
    for (const a of attempts) {
      const key = `${a.exerciseId}::${a.reviewedAt!.getTime()}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          exerciseId: a.exerciseId,
          question: byId.get(a.exerciseId)?.question ?? '',
          correctAnswer: byId.get(a.exerciseId)?.answer ?? '',
          correct: a.correct ?? false,
          comment: a.teacherComment,
          reviewedAt: a.reviewedAt!,
          submissions: [],
        };
        groups.set(key, group);
      }
      group.submissions.push({
        attemptId: a.id,
        studentUsername: a.user.username,
        studentAnswer: a.answer,
      });
    }
    return [...groups.values()].sort((x, y) => y.reviewedAt.getTime() - x.reviewedAt.getTime());
  }

  // Attempt + Exercise cho tung id duoc yeu cau sua -- controller dung de
  // kiem tra quyen so huu (moi attemptId co the thuoc exercise khac nhau
  // ve ly thuyet, nen kiem tra tung dong thay vi gia dinh dong nhat).
  async getAttemptsForEdit(attemptIds: string[]): Promise<AttemptForEdit[]> {
    const attempts = await this.prisma.attempt.findMany({
      where: { id: { in: attemptIds }, needsTeacherReview: false },
      select: { id: true, userId: true, exerciseId: true },
    });
    if (attempts.length === 0) return [];

    const exerciseIds = [...new Set(attempts.map((a) => a.exerciseId))];
    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, createdBy: true, question: true },
    });
    const byId = new Map(exercises.map((e) => [e.id, e]));

    return attempts
      .filter((a) => byId.has(a.exerciseId))
      .map((a) => ({ id: a.id, userId: a.userId, exercise: byId.get(a.exerciseId)! }));
  }

  // Sua lai 1 lan duyet da co -- CHI doi correct/teacherComment, KHONG dung
  // lai vao mastery/gamification: diem/XP da cong luc duyet dau la mot bo
  // dem cong don (Mastery.score, Gamification.xp), khong luu lai delta
  // rieng cho tung attempt nen khong the "hoan tac" chinh xac de cong lai
  // dung so. Coi day la sua BAN GHI danh gia, con diem so giu nguyen nhu
  // luc duyet dau tien.
  async editGroupReview(
    attemptIds: string[],
    correct: boolean,
    comment: string | null,
  ): Promise<void> {
    await this.prisma.attempt.updateMany({
      where: { id: { in: attemptIds } },
      data: {
        correct,
        understandingLevel: correct ? 'HIGH' : 'LOW',
        teacherComment: comment,
        reviewedAt: new Date(),
      },
    });
  }

  // Lich su tu luan cua CHINH hoc sinh nay -- de biet cau nao dang cho, cau
  // nao da duoc cham dung/sai va nhan xet cua giao vien (neu co), khong
  // phan biet exercise cua giao vien nao (khac voi cac ham "for teacher"
  // o tren, von gioi han theo exercise.createdBy).
  async getMyTextAttempts(userId: string) {
    const attempts = await this.prisma.attempt.findMany({
      // Tu luan la nhung Attempt tung di qua recordPendingAttempt: hoac dang
      // cho (needsTeacherReview=true) hoac da duoc duyet (reviewedBy khac
      // null). Attempt cua MCQ khong bao gio khop 2 dieu kien nay.
      where: { userId, OR: [{ needsTeacherReview: true }, { reviewedBy: { not: null } }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        exerciseId: true,
        topic: true,
        answer: true,
        correct: true,
        teacherComment: true,
        needsTeacherReview: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
    if (attempts.length === 0) return [];

    const exerciseIds = [...new Set(attempts.map((a) => a.exerciseId))];
    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, question: true, answer: true },
    });
    const byId = new Map(exercises.map((e) => [e.id, e]));

    return attempts.map((a) => ({
      attemptId: a.id,
      question: byId.get(a.exerciseId)?.question ?? '',
      correctAnswer: byId.get(a.exerciseId)?.answer ?? '',
      topic: a.topic,
      myAnswer: a.answer,
      needsTeacherReview: a.needsTeacherReview,
      correct: a.correct,
      teacherComment: a.teacherComment,
      createdAt: a.createdAt,
      reviewedAt: a.reviewedAt,
    }));
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
