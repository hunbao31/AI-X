export type DiagnosticDifficulty = 'de' | 'trung_binh' | 'kho';

export class CreateDiagnosticExerciseDto {
  skillCode!: string;
  difficulty!: DiagnosticDifficulty;
  question!: string;
  options!: string[];
  answer!: string;
}

export class ImportDiagnosticExercisesDto {
  skillCode!: string;
  // Raw CSV text (the frontend reads the uploaded file client-side).
  csv!: string;
  // Default difficulty for rows that omit the optional column.
  difficulty?: DiagnosticDifficulty;
}
