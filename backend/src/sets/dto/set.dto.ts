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

// Fast-path authoring: create a question AND attach it to the set in one
// call, instead of "create in the bank, then add from the bank" — mirrors
// the CSV row shape (optionA-D + a letter-or-text correctAnswer) so the
// same resolveAnswerFromOptions() helper backs both paths identically.
export class CreateInlineQuestionDto {
  question!: string;
  optionA!: string;
  optionB!: string;
  optionC?: string;
  optionD?: string;
  correctAnswer!: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export class ReorderSetDto {
  // Every exerciseId currently in the set, in the desired order.
  exerciseIds!: string[];
}

export class ImportSetDto {
  // Optionally attach the imported copy to one of the importer's classes.
  classId?: string | null;
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
