import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  ImportExercisesDto,
  ImportExcelDto,
  ExerciseFilters,
  ExerciseType,
  Difficulty,
} from './dto/create-exercise.dto';
import { parseQuestionRows, parseQuestionRowsFromCells, ParseResult } from './csv-import';
import { parseExcelToRows } from './excel-import';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';

const MAX_TAGS = 10;
const MAX_IMPORT_ROWS = 500;

function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter((t) => t !== '')),
  ].slice(0, MAX_TAGS);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const VALID_TYPES: ExerciseType[] = ['mcq', 'text'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

interface ExerciseCandidate {
  question: string;
  type: ExerciseType;
  options: string[] | null;
  answer: string;
  difficulty: Difficulty;
  topic: string;
}

// One invariant checker shared by create and update, so a PATCH can never
// leave a row in a state a POST would have rejected.
function validateCandidate(candidate: ExerciseCandidate): void {
  if (!candidate.question?.trim() || !candidate.answer?.trim() || !candidate.topic?.trim()) {
    throw apiError(
      'VALIDATION_ERROR',
      'Câu hỏi, đáp án và chủ đề là bắt buộc.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (!VALID_TYPES.includes(candidate.type)) {
    throw apiError(
      'VALIDATION_ERROR',
      'Loại câu hỏi phải là "mcq" hoặc "text".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (!VALID_DIFFICULTIES.includes(candidate.difficulty)) {
    throw apiError(
      'VALIDATION_ERROR',
      'Độ khó phải là "easy", "medium" hoặc "hard".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (candidate.type === 'mcq') {
    if (!Array.isArray(candidate.options) || candidate.options.length < 2) {
      throw apiError(
        'VALIDATION_ERROR',
        'Cần ít nhất 2 lựa chọn khi loại câu hỏi là "mcq".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!candidate.options.includes(candidate.answer)) {
      throw apiError(
        'VALIDATION_ERROR',
        'Đáp án phải là một trong các lựa chọn.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
  if (candidate.type === 'text' && candidate.options != null) {
    throw apiError(
      'VALIDATION_ERROR',
      'Không được có lựa chọn khi loại câu hỏi là "text".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  // An exercise linked to a class Topic (topicId set) is private to that
  // class — visible to its creator, an admin, or a member of the topic's
  // class. Topic-less exercises stay in the shared practice pool (unchanged
  // behavior). null return = admin, meaning "skip the check entirely."
  private async getAllowedTopicIds(user: AuthenticatedUser): Promise<Set<string> | null> {
    if (user.role === 'admin') return null;
    const topics = await this.prisma.topic.findMany({
      where: { class: { members: { some: { userId: user.sub } } } },
      select: { id: true },
    });
    return new Set(topics.map((t) => t.id));
  }

  private isVisible(
    exercise: { topicId: string | null; createdBy: string; isPublic: boolean },
    user: AuthenticatedUser,
    allowedTopicIds: Set<string> | null,
  ): boolean {
    if (allowedTopicIds === null) return true; // admin
    if (exercise.createdBy === user.sub) return true;
    if (exercise.topicId === null) return exercise.isPublic; // shared pool, gated by the toggle
    return allowedTopicIds.has(exercise.topicId);
  }

  // When an exercise is linked to a class Topic, only that class's teacher
  // (or an admin) may attach it, and the free-text label mirrors Topic.name.
  private async resolveTopicLink(
    topicId: string,
    user: AuthenticatedUser,
  ): Promise<{ topicId: string; topicName: string }> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { class: { select: { teacherId: true } } },
    });
    if (!topic) {
      throw apiError('TOPIC_NOT_FOUND', 'Chủ đề không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && topic.class.teacherId !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Chỉ giáo viên của lớp học mới có thể gắn bài tập vào chủ đề này.',
        HttpStatus.FORBIDDEN,
      );
    }
    return { topicId: topic.id, topicName: topic.name };
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    let topicLabel = dto?.topic ?? '';
    if (!dto?.topicId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'topicId là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const link = await this.resolveTopicLink(dto.topicId, user);
    const topicId: string = link.topicId;
    topicLabel = link.topicName;

    const candidate: ExerciseCandidate = {
      question: dto?.question ?? '',
      type: dto?.type as ExerciseType,
      options: dto?.type === 'mcq' ? (dto?.options ?? null) : null,
      answer: dto?.answer ?? '',
      difficulty: dto?.difficulty as Difficulty,
      topic: topicLabel,
    };
    validateCandidate(candidate);

    return this.prisma.exercise.create({
      data: {
        question: candidate.question,
        type: candidate.type,
        options: candidate.type === 'mcq' ? (candidate.options as string[]) : undefined,
        answer: candidate.answer,
        difficulty: candidate.difficulty,
        tags: normalizeTags(dto?.tags),
        topic: candidate.topic,
        topicId,
        // Meaningless once topicId is set (already private to that class),
        // but stored as given either way — simplest to reason about.
        isPublic: dto?.isPublic ?? false,
        createdBy: user.sub,
      },
    });
  }

  // Import-wide destination. When a class topic is linked, every row lands
  // there; otherwise each row may carry its own topic column, with the
  // import-wide label as fallback.
  private async resolveImportTopic(
    dto: { topic?: string; topicId?: string | null },
    user: AuthenticatedUser,
  ): Promise<{ topicId: string; importTopicLabel: string }> {
    let importTopicLabel = dto.topic?.trim() ?? '';
    if (!dto?.topicId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'topicId là bắt buộc khi nhập danh sách câu hỏi.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const link = await this.resolveTopicLink(dto.topicId, user);
    return { topicId: link.topicId, importTopicLabel: link.topicName };
  }

  // Shared tail of both import paths (CSV text and Excel) once each has
  // produced the same ParseResult shape — row validation already happened
  // upstream (csv-import.ts), this only resolves per-row topic + inserts.
  private async finalizeImport(
    parsed: ParseResult,
    topicId: string,
    importTopicLabel: string,
    user: AuthenticatedUser,
  ) {
    const { questions, errors } = parsed;

    if (questions.length > MAX_IMPORT_ROWS) {
      throw apiError(
        'IMPORT_TOO_LARGE',
        `Chỉ được nhập tối đa ${MAX_IMPORT_ROWS} câu hỏi mỗi tệp.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const rows: {
      question: string;
      type: 'mcq';
      options: string[];
      answer: string;
      difficulty: Difficulty;
      tags: string[];
      topic: string;
      topicId: string;
      createdBy: string;
    }[] = [];

    questions.forEach((q, i) => {
      const label = topicId ? importTopicLabel : q.topic?.trim() || importTopicLabel;
      if (!label) {
        errors.push({
          row: i + 1,
          reason: 'Thiếu chủ đề — thêm cột chủ đề hoặc chọn một chủ đề cho lần nhập này.',
        });
        return;
      }
      rows.push({
        question: q.question,
        type: 'mcq',
        options: q.options,
        answer: q.answer,
        difficulty: q.difficulty,
        tags: normalizeTags(q.tags),
        topic: label,
        topicId,
        createdBy: user.sub,
      });
    });

    if (rows.length > 0) {
      await this.prisma.exercise.createMany({ data: rows });
    }

    // Human-readable error strings — rendered directly by the import UI.
    return {
      created: rows.length,
      failed: errors.length,
      errors: errors.map((e) => `Dòng ${e.row}: ${e.reason}`),
    };
  }

  private resolveDefaultDifficulty(difficulty: unknown): Difficulty {
    return ['easy', 'medium', 'hard'].includes(difficulty as Difficulty)
      ? (difficulty as Difficulty)
      : 'easy';
  }

  // Bulk CSV import. Row validation lives in csv-import.ts; invalid rows are
  // skipped and reported, valid rows are inserted in one createMany.
  async import(dto: ImportExercisesDto, user: AuthenticatedUser) {
    if (typeof dto?.csv !== 'string' || dto.csv.trim() === '') {
      throw apiError(
        'VALIDATION_ERROR',
        'Nội dung CSV là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const { topicId, importTopicLabel } = await this.resolveImportTopic(dto, user);
    const defaultDifficulty = this.resolveDefaultDifficulty(dto.difficulty);
    const parsed = parseQuestionRows(dto.csv, defaultDifficulty);

    return this.finalizeImport(parsed, topicId, importTopicLabel, user);
  }

  // Bulk Excel (.xlsx) import — same column layout and downstream validation
  // as CSV, only the row source differs (excel-import.ts vs csv-import.ts's
  // parseCsv).
  async importExcel(buffer: Buffer, dto: ImportExcelDto, user: AuthenticatedUser) {
    const cells = await parseExcelToRows(buffer);
    if (cells.length === 0) {
      throw apiError(
        'VALIDATION_ERROR',
        'Tệp Excel không có dữ liệu.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const { topicId, importTopicLabel } = await this.resolveImportTopic(dto, user);
    const defaultDifficulty = this.resolveDefaultDifficulty(dto.difficulty);
    const parsed = parseQuestionRowsFromCells(cells, defaultDifficulty);

    return this.finalizeImport(parsed, topicId, importTopicLabel, user);
  }

  // Random question picker for quick-start and auto-generated quizzes.
  // masteryScore biases difficulty: strong students get harder questions.
  async pickRandom(
    options: {
      topic?: string;
      count: number;
      masteryScore?: number;
    },
    user: AuthenticatedUser,
  ) {
    const { topic, count, masteryScore } = options;

    const allowedTopicIds = await this.getAllowedTopicIds(user);
    const rawCandidates = await this.prisma.exercise.findMany({
      where: topic ? { topic } : undefined,
      select: { id: true, difficulty: true, topicId: true, createdBy: true, isPublic: true },
    });
    const candidates = rawCandidates.filter((c) => this.isVisible(c, user, allowedTopicIds));
    if (candidates.length === 0) return [];

    // Preference order by performance: high mastery → hard first, low → easy
    // first, unknown → fully mixed.
    let ordered: typeof candidates;
    if (masteryScore === undefined) {
      ordered = shuffleInPlace([...candidates]);
    } else {
      const preference: Difficulty[] =
        masteryScore > 70
          ? ['hard', 'medium', 'easy']
          : masteryScore < 30
            ? ['easy', 'medium', 'hard']
            : ['medium', 'hard', 'easy'];
      ordered = preference.flatMap((difficulty) =>
        shuffleInPlace(candidates.filter((c) => c.difficulty === difficulty)),
      );
    }

    const pickedIds = ordered.slice(0, count).map((c) => c.id);
    const rows = await this.prisma.exercise.findMany({
      where: { id: { in: pickedIds } },
    });
    // findMany loses the picked order — restore it.
    const byId = new Map(rows.map((r) => [r.id, r]));
    return pickedIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);
  }

  async update(id: string, dto: UpdateExerciseDto, user: AuthenticatedUser) {
    const existing = await this.prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      throw apiError('EXERCISE_NOT_FOUND', 'Bài tập không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && existing.createdBy !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Bạn chỉ có thể chỉnh sửa bài tập do mình tạo.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Resolve the topic link first — it may drive the `topic` label.
    let topicId: string = existing.topicId;
    let topicLabel = dto.topic ?? existing.topic;
    if (dto.topicId !== undefined) {
      if (!dto.topicId?.trim()) {
        throw apiError(
          'VALIDATION_ERROR',
          'topicId không thể để trống.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      const link = await this.resolveTopicLink(dto.topicId, user);
      topicId = link.topicId;
      topicLabel = link.topicName;
    }

    const mergedType = dto.type ?? existing.type;
    const mergedOptions =
      mergedType === 'text'
        ? null
        : dto.options !== undefined
          ? dto.options
          : (existing.options as string[] | null);

    const candidate: ExerciseCandidate = {
      question: dto.question ?? existing.question,
      type: mergedType,
      options: mergedOptions,
      answer: dto.answer ?? existing.answer,
      difficulty: dto.difficulty ?? existing.difficulty,
      topic: topicLabel,
    };
    validateCandidate(candidate);

    return this.prisma.exercise.update({
      where: { id },
      data: {
        question: candidate.question,
        type: candidate.type,
        // Switching mcq → text must actually clear the column, which for a
        // Json? field means DbNull, not undefined (undefined = "leave as is").
        options:
          candidate.type === 'mcq' ? (candidate.options as string[]) : Prisma.DbNull,
        answer: candidate.answer,
        difficulty: candidate.difficulty,
        tags: dto.tags !== undefined ? normalizeTags(dto.tags) : undefined,
        topic: candidate.topic,
        topicId,
        isPublic: dto.isPublic ?? existing.isPublic,
      },
    });
  }

  // Question bank: filterable by topic/topicId/difficulty/type/tag and
  // free-text search over the question. Results are filtered to what `user`
  // is allowed to see — topic-linked exercises outside the caller's own
  // classes never reach the response (see isVisible/getAllowedTopicIds).
  async findAll(filters: ExerciseFilters = {}, user: AuthenticatedUser) {
    try {
      const clauses: Prisma.ExerciseWhereInput[] = [];
      if (filters.createdBy) clauses.push({ createdBy: filters.createdBy });
      if (filters.topic?.trim()) clauses.push({ topic: filters.topic });
      if (filters.topicId?.trim()) clauses.push({ topicId: filters.topicId });
      if (
        filters.difficulty &&
        ['easy', 'medium', 'hard'].includes(filters.difficulty)
      ) {
        clauses.push({ difficulty: filters.difficulty as Difficulty });
      }
      if (filters.type && ['mcq', 'text'].includes(filters.type)) {
        clauses.push({ type: filters.type as ExerciseType });
      }
      if (filters.tag?.trim()) {
        clauses.push({ tags: { has: filters.tag.trim().toLowerCase() } });
      }
      if (filters.search?.trim()) {
        clauses.push({
          question: { contains: filters.search.trim(), mode: 'insensitive' },
        });
      }

      const [rows, allowedTopicIds] = await Promise.all([
        this.prisma.exercise.findMany({
          where: clauses.length > 0 ? { AND: clauses } : undefined,
          orderBy: { createdAt: 'desc' },
        }),
        this.getAllowedTopicIds(user),
      ]);
      return rows.filter((r) => this.isVisible(r, user, allowedTopicIds));
    } catch {
      // Never let a transient DB hiccup surface as a broken response —
      // an empty list is always a valid answer for "no exercises yet".
      return [];
    }
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) return null;
    const allowedTopicIds = await this.getAllowedTopicIds(user);
    if (!this.isVisible(exercise, user, allowedTopicIds)) {
      // Same as "not found" from the caller's perspective — don't confirm
      // that a private exercise exists to someone who can't see it.
      return null;
    }
    return exercise;
  }

  // Backs the teacher dashboard stats cards. Attempt.exerciseId has no
  // formal FK to Exercise (see schema.prisma comment on Attempt), so this
  // matches by value rather than via a relation.
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

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      throw apiError('EXERCISE_NOT_FOUND', 'Bài tập không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && existing.createdBy !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Bạn chỉ có thể xóa bài tập do mình tạo.',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.prisma.exercise.delete({ where: { id } });
    return { id };
  }
}
