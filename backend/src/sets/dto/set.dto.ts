export type QuizMode = 'practice' | 'exam';

export class CreateSetDto {
  title!: string;
  description?: string | null;
  classId?: string | null;
  isPublic?: boolean;
  // practice → instant per-question feedback; exam → answers stay hidden.
  mode?: QuizMode;
  // Seconds per question / whole quiz; null/undefined = untimed.
  timeLimitPerQuestion?: number | null;
  totalTimeLimit?: number | null;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  // Anyone holding this code may play the set ("private via code").
  accessCode?: string | null;
  isPublished?: boolean;
}

export class UpdateSetDto {
  title?: string;
  description?: string | null;
  classId?: string | null;
  isPublic?: boolean;
  mode?: QuizMode;
  timeLimitPerQuestion?: number | null;
  totalTimeLimit?: number | null;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  accessCode?: string | null;
  isPublished?: boolean;
}

export class CheckAnswerDto {
  exerciseId!: string;
  answer!: string;
  // Access code, when the set is private-by-code.
  code?: string;
}

export class StartAttemptDto {
  code?: string;
}

export class SaveProgressDto {
  answers!: SubmittedAnswer[];
  lastQuestionIndex!: number;
}

export class DuplicateSetDto {
  title?: string;
  // Clone target: attach the copy to another class (must be teacher of it).
  classId?: string | null;
}

export class QuickSubmitDto {
  answers!: SubmittedAnswer[];
}

export class AddExerciseToSetDto {
  exerciseId!: string;
}

export interface SubmittedAnswer {
  exerciseId: string;
  answer: string;
  // Milliseconds the student spent on this question (speed-bonus input).
  timeMs?: number;
}

export class SubmitSetDto {
  answers!: SubmittedAnswer[];
  // In-progress attempt to finalize (from POST :id/start); omitted → a new
  // completed attempt row is created directly.
  attemptId?: string;
  durationSeconds?: number;
  code?: string;
}
