import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { MasteryStore } from '../mastery/mastery.store';
import { AnalyticsService } from '../analytics/analytics.service';
import { GamificationService } from '../gamification/gamification.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';
import { toCsvLine } from '../common/csv';
import { ExercisesService } from '../exercises/exercises.service';
import {
  CreateSetDto,
  UpdateSetDto,
  SubmitSetDto,
  SubmittedAnswer,
  SaveProgressDto,
  DuplicateSetDto,
  QuickSubmitDto,
  QuizMode,
  CreateInlineQuestionDto,
  ImportSetDto,
} from './dto/set.dto';
import { questionXp } from './quiz-xp';
import { seededShuffle } from './quiz-shuffle';
import { resolveAnswerFromOptions } from '../exercises/answer-resolve';
import { Difficulty } from '../exercises/dto/create-exercise.dto';

const MAX_TIME_LIMIT_SECONDS = 600;
const MAX_TOTAL_TIME_SECONDS = 7200;
const POINTS_PER_CORRECT = 100;
const VALID_MODES: QuizMode[] = ['practice', 'exam'];
const QUICK_QUIZ_SIZE = 5;
const MAX_QUICK_ANSWERS = 20;

// What a student is allowed to see about a question while playing — no
// `answer` field; grading is server-side only.
export interface PlayableQuestion {
  exerciseId: string;
  order: number;
  question: string;
  type: 'mcq' | 'text';
  options: string[] | null;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface QuestionResult {
  exerciseId: string;
  correct: boolean;
  yourAnswer: string;
  // null in exam mode — the correct answer is never revealed.
  correctAnswer: string | null;
  // XP granted for this question (base × combo multiplier × speed bonus).
  xpEarned: number;
}

export interface CheckResult {
  correct: boolean;
  correctAnswer: string;
}

export interface QuizResult {
  // null for stateless quick quizzes (nothing persisted to resume/rank).
  attemptId: string | null;
  score: number;
  correctCount: number;
  totalCount: number;
  xpGained: number;
  results: QuestionResult[];
  gamification: { xp: number; level: number; streak: number };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  correctCount: number;
  totalCount: number;
  completedAt: Date | null;
}

// Same normalization the practice-flow fallback evaluator uses.
function answersMatch(submitted: string, expected: string): boolean {
  return submitted.trim().toLowerCase() === expected.trim().toLowerCase();
}

@Injectable()
export class SetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
    private readonly masteryStore: MasteryStore,
    private readonly analyticsService: AnalyticsService,
    private readonly gamificationService: GamificationService,
    private readonly exercisesService: ExercisesService,
  ) {}

  private validateTimeLimit(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 5 || value > MAX_TIME_LIMIT_SECONDS) {
      throw apiError(
        'VALIDATION_ERROR',
        `timeLimitPerQuestion phải là số nguyên từ 5 đến ${MAX_TIME_LIMIT_SECONDS} giây.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return value;
  }

  private validateMode(value: QuizMode | undefined): QuizMode | undefined {
    if (value === undefined) return undefined;
    if (!VALID_MODES.includes(value)) {
      throw apiError(
        'VALIDATION_ERROR',
        'mode phải là "practice" hoặc "exam".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return value;
  }

  private validateTotalTimeLimit(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 30 || value > MAX_TOTAL_TIME_SECONDS) {
      throw apiError(
        'VALIDATION_ERROR',
        `totalTimeLimit phải là số nguyên từ 30 đến ${MAX_TOTAL_TIME_SECONDS} giây.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return value;
  }

  private validateAccessCode(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const code = value.trim();
    if (code === '') return null;
    if (code.length < 4 || code.length > 32) {
      throw apiError(
        'VALIDATION_ERROR',
        'accessCode phải có từ 4-32 ký tự (hoặc để trống để xóa).',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return code;
  }

  async createSet(user: AuthenticatedUser, dto: CreateSetDto) {
    if (!dto?.title?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'title là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.classId) {
      // Only the class's own teacher can hang a quiz on it.
      await this.classesService.assertTeacherOf(dto.classId, user);
    }

    return this.prisma.exerciseSet.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        classId: dto.classId || null,
        isPublic: dto.isPublic ?? false,
        mode: this.validateMode(dto.mode) ?? 'practice',
        timeLimitPerQuestion: this.validateTimeLimit(dto.timeLimitPerQuestion),
        totalTimeLimit: this.validateTotalTimeLimit(dto.totalTimeLimit),
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleAnswers: dto.shuffleAnswers ?? false,
        accessCode: this.validateAccessCode(dto.accessCode),
        isPublished: dto.isPublished ?? true,
        createdBy: user.sub,
      },
      include: { _count: { select: { items: true } } },
    });
  }

  async updateSet(setId: string, user: AuthenticatedUser, dto: UpdateSetDto) {
    const set = await this.getOwnedSet(setId, user);

    if (dto.classId !== undefined && dto.classId !== null && dto.classId !== set.classId) {
      await this.classesService.assertTeacherOf(dto.classId, user);
    }
    if (dto.title !== undefined && !dto.title.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'title không được để trống.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.prisma.exerciseSet.update({
      where: { id: setId },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description?.trim() || null,
        classId: dto.classId === undefined ? undefined : dto.classId,
        isPublic: dto.isPublic,
        mode: this.validateMode(dto.mode),
        timeLimitPerQuestion:
          dto.timeLimitPerQuestion === undefined
            ? undefined
            : this.validateTimeLimit(dto.timeLimitPerQuestion),
        totalTimeLimit:
          dto.totalTimeLimit === undefined
            ? undefined
            : this.validateTotalTimeLimit(dto.totalTimeLimit),
        shuffleQuestions: dto.shuffleQuestions,
        shuffleAnswers: dto.shuffleAnswers,
        accessCode:
          dto.accessCode === undefined
            ? undefined
            : this.validateAccessCode(dto.accessCode),
        isPublished: dto.isPublished,
      },
      include: { _count: { select: { items: true } } },
    });
  }

  // Instant per-question feedback for the quiz player. Practice mode only —
  // exam mode never reveals whether an answer was right mid-quiz.
  async checkAnswer(
    setId: string,
    user: AuthenticatedUser,
    exerciseId: string,
    answer: string,
    code?: string,
  ): Promise<CheckResult> {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: {
        items: { where: { exerciseId }, include: { exercise: true } },
      },
    });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    await this.assertCanView(set, user, code);

    if (set.mode !== 'practice') {
      throw apiError(
        'EXAM_MODE',
        'Đáp án bị ẩn trong khi làm bài thi.',
        HttpStatus.FORBIDDEN,
      );
    }

    const item = set.items[0];
    if (!item) {
      throw apiError(
        'ITEM_NOT_FOUND',
        'Câu hỏi này không thuộc bộ đề.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      correct:
        typeof answer === 'string' &&
        answer.trim() !== '' &&
        answersMatch(answer, item.exercise.answer),
      correctAnswer: item.exercise.answer,
    };
  }

  // Everything the caller may see: their own sets, public sets, and sets
  // attached to classes they belong to.
  listVisible(user: AuthenticatedUser) {
    return this.prisma.exerciseSet.findMany({
      where:
        user.role === 'admin'
          ? undefined
          : {
              OR: [
                { createdBy: user.sub },
                { isPublic: true },
                { class: { members: { some: { userId: user.sub } } } },
              ],
            },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { items: true, attempts: true } },
      },
    }).then((sets) =>
      // Drafts (isPublished=false) surface for their owner only.
      sets.filter(
        (s) => s.isPublished || s.createdBy === user.sub || user.role === 'admin',
      ),
    );
  }

  async getDetail(setId: string, user: AuthenticatedUser, code?: string) {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: {
        creator: { select: { id: true, username: true } },
        class: { select: { id: true, name: true } },
        items: {
          orderBy: { order: 'asc' },
          include: { exercise: true },
        },
      },
    });

    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    await this.assertCanView(set, user, code);

    const isOwner = user.role === 'admin' || set.createdBy === user.sub;
    if (!set.isPublished && !isOwner) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }

    // Students get the playable projection — never the answers.
    let questions: PlayableQuestion[] = set.items.map((item) => ({
      exerciseId: item.exerciseId,
      order: item.order,
      question: item.exercise.question,
      type: item.exercise.type,
      options: (item.exercise.options as string[] | null) ?? null,
      difficulty: item.exercise.difficulty,
      topic: item.exercise.topic,
    }));

    // Kahoot-style randomization. Seeded by user+set so the order is stable
    // across refetches and resume — different per student, same for you.
    const seed = `${set.id}:${user.sub}`;
    if (set.shuffleQuestions) {
      questions = seededShuffle(questions, seed).map((q, i) => ({
        ...q,
        order: i + 1,
      }));
    }
    if (set.shuffleAnswers) {
      questions = questions.map((q) => ({
        ...q,
        options: q.options ? seededShuffle(q.options, `${seed}:${q.exerciseId}`) : null,
      }));
    }

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      classId: set.classId,
      class: set.class,
      isPublic: set.isPublic,
      isPublished: set.isPublished,
      mode: set.mode,
      shuffleQuestions: set.shuffleQuestions,
      shuffleAnswers: set.shuffleAnswers,
      timeLimitPerQuestion: set.timeLimitPerQuestion,
      totalTimeLimit: set.totalTimeLimit,
      // The access code itself is only exposed to the owner.
      accessCode: isOwner ? set.accessCode : undefined,
      hasAccessCode: set.accessCode !== null,
      roomCode: set.roomCode,
      createdBy: set.createdBy,
      creator: set.creator,
      createdAt: set.createdAt,
      questionCount: questions.length,
      questions,
      // Full items (with answers) only for the owner's editing UI.
      items: isOwner ? set.items : undefined,
    };
  }

  async addExercise(setId: string, user: AuthenticatedUser, exerciseId: string) {
    if (!exerciseId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'exerciseId là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.getOwnedSet(setId, user);

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) {
      throw apiError('EXERCISE_NOT_FOUND', 'Bài tập không tồn tại.', HttpStatus.NOT_FOUND);
    }

    const last = await this.prisma.exerciseSetItem.findFirst({
      where: { setId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    try {
      return await this.prisma.exerciseSetItem.create({
        data: { setId, exerciseId, order: (last?.order ?? 0) + 1 },
        include: { exercise: true },
      });
    } catch (err) {
      const isDuplicate =
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002';
      if (isDuplicate) {
        throw apiError(
          'EXERCISE_ALREADY_IN_SET',
          'Bài tập này đã có trong bộ đề.',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async removeExercise(setId: string, user: AuthenticatedUser, exerciseId: string) {
    await this.getOwnedSet(setId, user);

    const item = await this.prisma.exerciseSetItem.findUnique({
      where: { setId_exerciseId: { setId, exerciseId } },
    });
    if (!item) {
      throw apiError(
        'ITEM_NOT_FOUND',
        'Bài tập này không có trong bộ đề.',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.exerciseSetItem.delete({ where: { id: item.id } });
    return { setId, exerciseId };
  }

  // Fast-path authoring: create a question AND attach it in one call — the
  // primary way questions get into a set now, "add from bank" is secondary.
  // Every question authored this way is a real, fully-owned Exercise row, so
  // it lands in the author's personal bank automatically, with no separate
  // sync step.
  async addInlineQuestion(
    setId: string,
    user: AuthenticatedUser,
    dto: CreateInlineQuestionDto,
  ) {
    const set = await this.getOwnedSet(setId, user);

    const question = dto?.question?.trim();
    if (!question) {
      throw apiError(
        'VALIDATION_ERROR',
        'question là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const options = [dto?.optionA, dto?.optionB, dto?.optionC, dto?.optionD]
      .map((o) => o?.trim() ?? '')
      .filter((o) => o !== '');
    if (options.length < 2) {
      throw apiError(
        'VALIDATION_ERROR',
        'Cần ít nhất hai lựa chọn (A và B).',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      throw apiError(
        'VALIDATION_ERROR',
        'Các lựa chọn phải khác nhau.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const correctRaw = dto?.correctAnswer?.trim();
    if (!correctRaw) {
      throw apiError(
        'VALIDATION_ERROR',
        'correctAnswer là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const resolved = resolveAnswerFromOptions(options, correctRaw);
    if (resolved.error) {
      throw apiError('VALIDATION_ERROR', resolved.error, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const difficulty: Difficulty =
      dto?.difficulty && ['easy', 'medium', 'hard'].includes(dto.difficulty)
        ? dto.difficulty
        : 'medium';

    return this.prisma.$transaction(async (tx) => {
      const exercise = await tx.exercise.create({
        data: {
          question,
          type: 'mcq',
          options,
          answer: resolved.answer as string,
          difficulty,
          // No natural "topic" in the fast-authoring flow — group by the set
          // itself so the personal bank stays meaningfully organized.
          topic: set.title,
          createdBy: user.sub,
        },
      });

      const last = await tx.exerciseSetItem.findFirst({
        where: { setId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      return tx.exerciseSetItem.create({
        data: { setId, exerciseId: exercise.id, order: (last?.order ?? 0) + 1 },
        include: { exercise: true },
      });
    });
  }

  // Drag-and-drop reorder — exerciseIds must be exactly the set's current
  // questions (no silent add/drop through this endpoint).
  async reorderItems(setId: string, user: AuthenticatedUser, exerciseIds: unknown) {
    await this.getOwnedSet(setId, user);
    if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      throw apiError(
        'VALIDATION_ERROR',
        'Mảng exerciseIds là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existing = await this.prisma.exerciseSetItem.findMany({
      where: { setId },
      select: { exerciseId: true },
    });
    const existingIds = new Set(existing.map((i) => i.exerciseId));
    const providedIds = new Set(exerciseIds);
    const matches =
      existingIds.size === providedIds.size &&
      [...existingIds].every((id) => providedIds.has(id));
    if (!matches) {
      throw apiError(
        'VALIDATION_ERROR',
        'exerciseIds phải khớp chính xác với các câu hỏi hiện có trong bộ đề.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.prisma.$transaction(
      (exerciseIds as string[]).map((exerciseId, i) =>
        this.prisma.exerciseSetItem.update({
          where: { setId_exerciseId: { setId, exerciseId } },
          data: { order: i + 1 },
        }),
      ),
    );
    return { setId, order: exerciseIds as string[] };
  }

  async deleteSet(setId: string, user: AuthenticatedUser) {
    await this.getOwnedSet(setId, user);
    // ExerciseSetItem + QuizAttempt cascade via the schema; Exercise rows
    // are untouched (no FK from Exercise to ExerciseSet), so every question
    // stays in the owner's personal bank exactly as before the delete.
    await this.prisma.exerciseSet.delete({ where: { id: setId } });
    return { id: setId };
  }

  // Marketplace: browse public, published sets across every user.
  async listMarketplace(query: { search?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(query.limit ?? '', 10) || 20),
    );

    const where: Prisma.ExerciseSetWhereInput = {
      isPublic: true,
      isPublished: true,
      ...(query.search?.trim()
        ? { title: { contains: query.search.trim(), mode: 'insensitive' as const } }
        : {}),
    };

    const rows = await this.prisma.exerciseSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit + 1,
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { items: true, attempts: true } },
      },
    });

    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit), page, limit, hasMore };
  }

  // Deep-clone a public set into the importer's own ownership: new Exercise
  // rows (so they can edit/delete freely) + a new ExerciseSet, fully
  // independent of the original. Deleting either copy never touches the
  // other — there is no shared row between them after this returns.
  async importSet(setId: string, user: AuthenticatedUser, dto: ImportSetDto) {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (!set.isPublic && user.role !== 'admin') {
      throw apiError(
        'FORBIDDEN',
        'Chỉ có thể nhập các bộ đề công khai.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (dto?.classId) {
      await this.classesService.assertTeacherOf(dto.classId, user);
    }

    const newSetId = await this.prisma.$transaction(async (tx) => {
      const newSet = await tx.exerciseSet.create({
        data: {
          title: `${set.title} (đã nhập)`,
          description: set.description,
          classId: dto?.classId ?? null,
          // Imported copies always start private — importing never
          // auto-republishes someone else's content under your name.
          isPublic: false,
          isPublished: true,
          mode: set.mode,
          shuffleQuestions: set.shuffleQuestions,
          shuffleAnswers: set.shuffleAnswers,
          timeLimitPerQuestion: set.timeLimitPerQuestion,
          totalTimeLimit: set.totalTimeLimit,
          createdBy: user.sub,
        },
      });

      for (const item of set.items) {
        const newExercise = await tx.exercise.create({
          data: {
            question: item.exercise.question,
            type: item.exercise.type,
            options: item.exercise.options ?? undefined,
            answer: item.exercise.answer,
            difficulty: item.exercise.difficulty,
            tags: item.exercise.tags,
            topic: item.exercise.topic,
            // No topicId: the importer doesn't own the original's class/topic.
            createdBy: user.sub,
          },
        });
        await tx.exerciseSetItem.create({
          data: { setId: newSet.id, exerciseId: newExercise.id, order: item.order },
        });
      }

      return newSet.id;
    });

    return this.prisma.exerciseSet.findUnique({
      where: { id: newSetId },
      include: { _count: { select: { items: true } } },
    });
  }

  async submit(
    setId: string,
    user: AuthenticatedUser,
    dto: SubmitSetDto,
  ): Promise<QuizResult> {
    if (!Array.isArray(dto?.answers)) {
      throw apiError(
        'VALIDATION_ERROR',
        'Mảng answers là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    await this.assertCanView(set, user, dto.code);

    if (set.items.length === 0) {
      throw apiError(
        'SET_EMPTY',
        'Bộ đề này chưa có câu hỏi nào.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const answerByExercise = new Map<string, { answer: string; timeMs: number | null }>(
      dto.answers
        .filter((a): a is SubmittedAnswer => typeof a?.exerciseId === 'string')
        .map((a) => [
          a.exerciseId,
          {
            answer: typeof a.answer === 'string' ? a.answer : '',
            timeMs:
              typeof a.timeMs === 'number' && Number.isFinite(a.timeMs) && a.timeMs >= 0
                ? a.timeMs
                : null,
          },
        ]),
    );

    const results: QuestionResult[] = [];
    let correctCount = 0;
    let xpGained = 0;
    // In-quiz combo: consecutive correct answers build an XP multiplier
    // (3+ → x1.2, 5+ → x1.5); a wrong answer resets it.
    let combo = 0;

    for (const item of set.items) {
      const entry = answerByExercise.get(item.exerciseId);
      const submitted = entry?.answer ?? '';
      const correct = submitted !== '' && answersMatch(submitted, item.exercise.answer);
      if (correct) {
        correctCount++;
        combo++;
      } else {
        combo = 0;
      }

      const xpEarned = questionXp(
        correct,
        combo,
        entry?.timeMs,
        set.timeLimitPerQuestion,
      );
      xpGained += xpEarned;

      results.push({
        exerciseId: item.exerciseId,
        correct,
        yourAnswer: submitted,
        // Exam mode: students learn what they got right, never the answers.
        correctAnswer: set.mode === 'exam' ? null : item.exercise.answer,
        xpEarned,
      });

      // Feed the same learning pipeline the practice flow uses, so quiz play
      // counts toward mastery, analytics, and streaks/XP.
      const level = correct ? 'HIGH' : 'LOW';
      await this.analyticsService.recordAttempt(
        user.sub,
        item.exerciseId,
        item.exercise.topic,
        submitted,
        correct,
        level,
      );
      await this.masteryStore.recordAttempt(
        user.sub,
        item.exercise.topic,
        level,
        item.exercise.topicId,
      );
      await this.gamificationService.recordAttempt(user.sub, correct, xpEarned);
    }

    const totalCount = set.items.length;
    const score = correctCount * POINTS_PER_CORRECT;

    // Duration: client-reported total, falling back to the sum of the
    // per-question times.
    const summedMs = [...answerByExercise.values()].reduce(
      (sum, a) => sum + (a.timeMs ?? 0),
      0,
    );
    const durationSeconds =
      typeof dto.durationSeconds === 'number' &&
      Number.isFinite(dto.durationSeconds) &&
      dto.durationSeconds >= 0
        ? Math.round(dto.durationSeconds)
        : summedMs > 0
          ? Math.round(summedMs / 1000)
          : null;

    const finalData = {
      score,
      correctCount,
      totalCount,
      answers: dto.answers as unknown as Prisma.InputJsonValue,
      durationSeconds,
      completedAt: new Date(),
    };

    // Finalize the in-progress attempt from POST :id/start when given —
    // otherwise record a fresh completed attempt (legacy clients).
    let attempt;
    if (dto.attemptId) {
      const existing = await this.prisma.quizAttempt.findUnique({
        where: { id: dto.attemptId },
      });
      if (
        existing &&
        existing.userId === user.sub &&
        existing.setId === setId &&
        existing.completedAt === null
      ) {
        attempt = await this.prisma.quizAttempt.update({
          where: { id: existing.id },
          data: finalData,
        });
      }
    }
    if (!attempt) {
      attempt = await this.prisma.quizAttempt.create({
        data: { setId, userId: user.sub, ...finalData },
      });
    }

    const gamification = await this.gamificationService.getSummary(user.sub);

    return {
      attemptId: attempt.id,
      score,
      correctCount,
      totalCount,
      xpGained,
      results,
      gamification,
    };
  }

  async leaderboard(
    setId: string,
    user: AuthenticatedUser,
    code?: string,
  ): Promise<LeaderboardEntry[]> {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      select: {
        id: true,
        isPublic: true,
        createdBy: true,
        classId: true,
        accessCode: true,
      },
    });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    await this.assertCanView(set, user, code);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { setId, completedAt: { not: null } },
      orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    // Best attempt per user; attempts are already sorted best-first.
    const seen = new Set<string>();
    const entries: LeaderboardEntry[] = [];
    for (const attempt of attempts) {
      if (seen.has(attempt.userId)) continue;
      seen.add(attempt.userId);
      entries.push({
        rank: entries.length + 1,
        userId: attempt.userId,
        username: attempt.user.username,
        avatar: attempt.user.avatar,
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalCount: attempt.totalCount,
        completedAt: attempt.completedAt,
      });
    }
    return entries;
  }

  // --- resume / auto-save ---

  // Creates (or resumes) the in-progress attempt for this user+set. The
  // player calls this on Start; the returned answers + index restore state.
  async startAttempt(setId: string, user: AuthenticatedUser, code?: string) {
    const set = await this.prisma.exerciseSet.findUnique({
      where: { id: setId },
      include: { _count: { select: { items: true } } },
    });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    await this.assertCanView(set, user, code);

    const existing = await this.prisma.quizAttempt.findFirst({
      where: { setId, userId: user.sub, completedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    const attempt =
      existing ??
      (await this.prisma.quizAttempt.create({
        data: {
          setId,
          userId: user.sub,
          totalCount: set._count.items,
          answers: [],
          lastQuestionIndex: 0,
        },
      }));

    return {
      attemptId: attempt.id,
      lastQuestionIndex: attempt.lastQuestionIndex,
      answers: (attempt.answers as unknown as SubmittedAnswer[]) ?? [],
    };
  }

  // Fire-and-forget auto-save from the player after each question.
  async saveProgress(
    attemptId: string,
    user: AuthenticatedUser,
    dto: SaveProgressDto,
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.userId !== user.sub) {
      throw apiError('ATTEMPT_NOT_FOUND', 'Lượt làm bài không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (attempt.completedAt !== null) {
      throw apiError(
        'ATTEMPT_COMPLETED',
        'Lượt làm bài này đã được nộp.',
        HttpStatus.CONFLICT,
      );
    }

    const answers = Array.isArray(dto?.answers)
      ? dto.answers.filter(
          (a): a is SubmittedAnswer =>
            typeof a?.exerciseId === 'string' && typeof a?.answer === 'string',
        )
      : [];
    const lastQuestionIndex =
      Number.isInteger(dto?.lastQuestionIndex) && dto.lastQuestionIndex >= 0
        ? dto.lastQuestionIndex
        : 0;

    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as unknown as Prisma.InputJsonValue,
        lastQuestionIndex,
      },
    });
    return { attemptId, lastQuestionIndex, saved: answers.length };
  }

  // --- teacher tools ---

  // Duplicate (optionally into another class — "clone quiz"). Access code
  // and room code are never copied; the copy starts private.
  async duplicate(setId: string, user: AuthenticatedUser, dto: DuplicateSetDto) {
    const set = await this.getOwnedSet(setId, user);
    if (dto?.classId) {
      await this.classesService.assertTeacherOf(dto.classId, user);
    }
    const items = await this.prisma.exerciseSetItem.findMany({
      where: { setId },
      orderBy: { order: 'asc' },
      select: { exerciseId: true, order: true },
    });

    return this.prisma.exerciseSet.create({
      data: {
        title: dto?.title?.trim() || `${set.title} (bản sao)`,
        description: set.description,
        classId: dto?.classId ?? null,
        isPublic: false,
        isPublished: true,
        mode: set.mode,
        shuffleQuestions: set.shuffleQuestions,
        shuffleAnswers: set.shuffleAnswers,
        timeLimitPerQuestion: set.timeLimitPerQuestion,
        totalTimeLimit: set.totalTimeLimit,
        createdBy: user.sub,
        items: { create: items },
      },
      include: { _count: { select: { items: true } } },
    });
  }

  // CSV export in the same format the importer accepts (round-trippable).
  async exportCsv(setId: string, user: AuthenticatedUser) {
    const set = await this.getOwnedSet(setId, user);
    const items = await this.prisma.exerciseSetItem.findMany({
      where: { setId },
      orderBy: { order: 'asc' },
      include: { exercise: true },
    });

    const lines = [
      'question,optionA,optionB,optionC,optionD,correctAnswer,topic,difficulty,tags',
      ...items.map((item) => {
        const options = ((item.exercise.options as string[] | null) ?? []).slice(0, 4);
        while (options.length < 4) options.push('');
        return toCsvLine([
          item.exercise.question,
          ...options,
          item.exercise.answer,
          item.exercise.topic,
          item.exercise.difficulty,
          item.exercise.tags.join(';'),
        ]);
      }),
    ];

    const safeTitle = set.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'quiz';
    return { filename: `${safeTitle}.csv`, csv: lines.join('\r\n') };
  }

  // Resolve a private access code to its set (entry point for "have a code?").
  async findByCode(code: string, user: AuthenticatedUser) {
    const trimmed = code?.trim();
    if (!trimmed) {
      throw apiError(
        'VALIDATION_ERROR',
        'code là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const set = await this.prisma.exerciseSet.findFirst({
      where: { accessCode: trimmed },
      select: { id: true, title: true, isPublished: true, createdBy: true },
    });
    if (!set || (!set.isPublished && set.createdBy !== user.sub)) {
      throw apiError(
        'SET_NOT_FOUND',
        'Không có bộ đề nào khớp với mã này.',
        HttpStatus.NOT_FOUND,
      );
    }
    return { id: set.id, title: set.title };
  }

  // --- quick start (stateless random quiz) ---

  async quickStart(user: AuthenticatedUser) {
    const topics = await this.prisma.exercise.groupBy({ by: ['topic'] });
    if (topics.length === 0) {
      throw apiError(
        'NO_EXERCISES',
        'Chưa có câu hỏi nào — hãy nhờ giáo viên thêm câu hỏi.',
        HttpStatus.NOT_FOUND,
      );
    }
    const topic = topics[Math.floor(Math.random() * topics.length)].topic;

    // Difficulty scaling: strong mastery in this topic → harder questions.
    const mastery = await this.prisma.mastery.findUnique({
      where: { userId_topic: { userId: user.sub, topic } },
    });

    const picked = await this.exercisesService.pickRandom({
      topic,
      count: QUICK_QUIZ_SIZE,
      masteryScore: mastery?.score,
    });

    const questions: PlayableQuestion[] = picked.map((exercise, i) => ({
      exerciseId: exercise.id,
      order: i + 1,
      question: exercise.question,
      type: exercise.type,
      options: (exercise.options as string[] | null) ?? null,
      difficulty: exercise.difficulty,
      topic: exercise.topic,
    }));

    return { topic, questionCount: questions.length, questions };
  }

  // Grades a quick quiz against the exercises directly — no set, no attempt
  // row, but the full XP/mastery/analytics pipeline still runs.
  async quickSubmit(user: AuthenticatedUser, dto: QuickSubmitDto): Promise<QuizResult> {
    if (!Array.isArray(dto?.answers) || dto.answers.length === 0) {
      throw apiError(
        'VALIDATION_ERROR',
        'Mảng answers là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const seen = new Set<string>();
    const submitted = dto.answers
      .filter(
        (a): a is SubmittedAnswer =>
          typeof a?.exerciseId === 'string' && !seen.has(a.exerciseId) && !!seen.add(a.exerciseId),
      )
      .slice(0, MAX_QUICK_ANSWERS);

    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: submitted.map((a) => a.exerciseId) } },
    });
    const byId = new Map(exercises.map((e) => [e.id, e]));

    const results: QuestionResult[] = [];
    let correctCount = 0;
    let xpGained = 0;
    let combo = 0;

    for (const answer of submitted) {
      const exercise = byId.get(answer.exerciseId);
      if (!exercise) continue;

      const submittedAnswer = typeof answer.answer === 'string' ? answer.answer : '';
      const correct =
        submittedAnswer !== '' && answersMatch(submittedAnswer, exercise.answer);
      combo = correct ? combo + 1 : 0;
      if (correct) correctCount++;

      const xpEarned = questionXp(correct, combo, answer.timeMs, null);
      xpGained += xpEarned;

      results.push({
        exerciseId: exercise.id,
        correct,
        yourAnswer: submittedAnswer,
        correctAnswer: exercise.answer,
        xpEarned,
      });

      const level = correct ? 'HIGH' : 'LOW';
      await this.analyticsService.recordAttempt(
        user.sub,
        exercise.id,
        exercise.topic,
        submittedAnswer,
        correct,
        level,
      );
      await this.masteryStore.recordAttempt(user.sub, exercise.topic, level, exercise.topicId);
      await this.gamificationService.recordAttempt(user.sub, correct, xpEarned);
    }

    const gamification = await this.gamificationService.getSummary(user.sub);

    return {
      attemptId: null,
      score: correctCount * POINTS_PER_CORRECT,
      correctCount,
      totalCount: results.length,
      xpGained,
      results,
      gamification,
    };
  }

  // --- helpers ---

  private async getOwnedSet(setId: string, user: AuthenticatedUser) {
    const set = await this.prisma.exerciseSet.findUnique({ where: { id: setId } });
    if (!set) {
      throw apiError('SET_NOT_FOUND', 'Bộ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && set.createdBy !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Chỉ người tạo bộ đề mới có thể chỉnh sửa.',
        HttpStatus.FORBIDDEN,
      );
    }
    return set;
  }

  // Privacy rules: public sets → anyone; class sets → members; code-locked
  // sets → anyone presenting the code; otherwise creator only; admin → all.
  private async assertCanView(
    set: {
      id: string;
      isPublic: boolean;
      createdBy: string;
      classId: string | null;
      accessCode: string | null;
    },
    user: AuthenticatedUser,
    code?: string,
  ): Promise<void> {
    if (user.role === 'admin' || set.isPublic || set.createdBy === user.sub) return;
    if (set.accessCode && code && code.trim() === set.accessCode) return;
    if (set.classId && (await this.classesService.isMember(set.classId, user.sub))) {
      return;
    }

    throw apiError(
      'FORBIDDEN',
      'Bạn không có quyền truy cập bộ đề này.',
      HttpStatus.FORBIDDEN,
    );
  }
}
