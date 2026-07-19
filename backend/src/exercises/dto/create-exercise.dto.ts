export type ExerciseType = 'mcq' | 'text';
export type Difficulty = 'easy' | 'medium' | 'hard';

export class CreateExerciseDto {
  question: string;
  type: ExerciseType;
  options?: string[] | null;
  answer: string;
  difficulty: Difficulty;
  topic: string;
}
