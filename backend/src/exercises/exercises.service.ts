import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  ImportExercisesDto,
  ExerciseFilters,
  ExerciseType,
  Difficulty,
} from './dto/create-exercise.dto';
import { parseQuestionRows } from './csv-import';
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
      'question, answer, and topic are required.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (!VALID_TYPES.includes(candidate.type)) {
    throw apiError(
      'VALIDATION_ERROR',
      'type must be "mcq" or "text".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (!VALID_DIFFICULTIES.includes(candidate.difficulty)) {
    throw apiError(
      'VALIDATION_ERROR',
      'difficulty must be "easy", "medium", or "hard".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (candidate.type === 'mcq') {
    if (!Array.isArray(candidate.options) || candidate.options.length < 2) {
      throw apiError(
        'VALIDATION_ERROR',
        'options (at least 2) are required when type is "mcq".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!candidate.options.includes(candidate.answer)) {
      throw apiError(
        'VALIDATION_ERROR',
        'answer must be one of the options.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
  if (candidate.type === 'text' && candidate.options != null) {
    throw apiError(
      'VALIDATION_ERROR',
      'options must be omitted when type is "text".',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw apiError('TOPIC_NOT_FOUND', 'Topic does not exist.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && topic.class.teacherId !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Only the class teacher can attach exercises to this topic.',
        HttpStatus.FORBIDDEN,
      );
    }
    return { topicId: topic.id, topicName: topic.name };
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    let topicLabel = dto?.topic ?? '';
    let topicId: string | null = null;

    if (dto?.topicId) {
      const link = await this.resolveTopicLink(dto.topicId, user);
      topicId = link.topicId;
      topicLabel = link.topicName;
    }

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
        createdBy: user.sub,
      },
    });
  }

  // Bulk CSV import. Row validation lives in csv-import.ts; invalid rows are
  // skipped and reported, valid rows are inserted in one createMany.
  async import(dto: ImportExercisesDto, user: AuthenticatedUser) {
    if (typeof dto?.csv !== 'string' || dto.csv.trim() === '') {
      throw apiError(
        'VALIDATION_ERROR',
        'csv content is required.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Import-wide destination. When a class topic is linked, every row lands
    // there; otherwise each row may carry its own topic column, with the
    // import-wide label as fallback.
    let importTopicLabel = dto.topic?.trim() ?? '';
    let topicId: string | null = null;
    if (dto.topicId) {
      const link = await this.resolveTopicLink(dto.topicId, user);
      topicId = link.topicId;
      importTopicLabel = link.topicName;
    }

    const defaultDifficulty: Difficulty = ['easy', 'medium', 'hard'].includes(
      dto.difficulty as Difficulty,
    )
      ? (dto.difficulty as Difficulty)
      : 'easy';

    const { questions, errors } = parseQuestionRows(dto.csv, defaultDifficulty);

    if (questions.length > MAX_IMPORT_ROWS) {
      throw apiError(
        'IMPORT_TOO_LARGE',
        `Import at most ${MAX_IMPORT_ROWS} questions per file.`,
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
      topicId: string | null;
      createdBy: string;
    }[] = [];

    questions.forEach((q, i) => {
      const label = topicId ? importTopicLabel : q.topic?.trim() || importTopicLabel;
      if (!label) {
        errors.push({
          row: i + 1,
          reason: 'Missing topic — add a topic column or pick one for the import.',
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
      errors: errors.map((e) => `Row ${e.row}: ${e.reason}`),
    };
  }

  // Random question picker for quick-start and auto-generated quizzes.
  // masteryScore biases difficulty: strong students get harder questions.
  async pickRandom(options: {
    topic?: string;
    count: number;
    masteryScore?: number;
  }) {
    const { topic, count, masteryScore } = options;

    const candidates = await this.prisma.exercise.findMany({
      where: topic ? { topic } : undefined,
      select: { id: true, difficulty: true },
    });
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
      throw apiError('EXERCISE_NOT_FOUND', 'Exercise does not exist.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && existing.createdBy !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'You can only edit exercises you created.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Resolve the topic link first — it may drive the `topic` label.
    let topicId: string | null = existing.topicId;
    let topicLabel = dto.topic ?? existing.topic;
    if (dto.topicId !== undefined) {
      if (dto.topicId === null) {
        topicId = null; // unlink, keep whatever label applies
      } else {
        const link = await this.resolveTopicLink(dto.topicId, user);
        topicId = link.topicId;
        topicLabel = link.topicName;
      }
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
      },
    });
  }

  // Question bank: filterable by topic/topicId/difficulty/type/tag and
  // free-text search over the question.
  async findAll(filters: ExerciseFilters = {}) {
    try {
      const clauses: Prisma.ExerciseWhereInput[] = [];
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

      return await this.prisma.exercise.findMany({
        where: clauses.length > 0 ? { AND: clauses } : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Never let a transient DB hiccup surface as a broken response —
      // an empty list is always a valid answer for "no exercises yet".
      return [];
    }
  }

  findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
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
      throw apiError('EXERCISE_NOT_FOUND', 'Exercise does not exist.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && existing.createdBy !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'You can only delete exercises you created.',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.prisma.exercise.delete({ where: { id } });
    return { id };
  }
}
