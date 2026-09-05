export type ExerciseType = 'mcq' | 'text';
export type Difficulty = 'easy' | 'medium' | 'hard';

export class CreateExerciseDto {
  question!: string;
  type!: ExerciseType;
  options?: string[] | null;
  answer!: string;
  difficulty!: Difficulty;
  tags?: string[];
  // Free-text label. Optional when topicId is given (derived from the Topic).
  topic?: string;
  // Optional link to a class Topic; when set, `topic` mirrors Topic.name.
  topicId?: string | null;
  classId?: string | null;
  // Only meaningful when topicId is unset — a topic-linked question is
  // already private to that class regardless of this flag. Defaults to
  // false (private) for newly-created free-standing questions.
  isPublic?: boolean;
}

// PATCH payload — every field optional; merged over the existing row and
// re-validated as a whole.
export class UpdateExerciseDto {
  question?: string;
  type?: ExerciseType;
  options?: string[] | null;
  answer?: string;
  difficulty?: Difficulty;
  tags?: string[];
  topic?: string;
  topicId?: string | null;
  classId?: string | null;
  isPublic?: boolean;
}

export class ImportExercisesDto {
  // Raw CSV text (the frontend reads the uploaded file client-side).
  csv!: string;
  // Where the imported questions land: a class Topic link or a free label.
  topicId?: string | null;
  classId?: string | null;
  topic?: string;
  // Default difficulty for rows that omit the optional column.
  difficulty?: Difficulty;
}

// Same destination fields as ImportExercisesDto, minus `csv` — the file
// itself arrives as multipart (see excel-upload.config.ts), these are the
// accompanying form fields.
export class ImportExcelDto {
  topicId?: string | null;
  classId?: string | null;
  topic?: string;
  difficulty?: Difficulty;
}

export interface ExerciseFilters {
  topic?: string;
  topicId?: string;
  difficulty?: string;
  type?: string;
  tag?: string;
  search?: string;
  // Personal bank: restrict to one author's questions.
  createdBy?: string;
}
