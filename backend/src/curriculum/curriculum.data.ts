export interface CurriculumExercise {
  id: string;
  question: string;
  correctAnswer: string;
}

export interface CurriculumTopic {
  id: string;
  name: string;
  exercises: CurriculumExercise[];
}

export interface CurriculumGrade {
  id: string;
  name: string;
  topics: CurriculumTopic[];
}

// In-memory only, per Step 10 simplification rules — no database yet.
// Same 5 exercises from Step 3, now organized under Grade -> Topic instead
// of a flat list.
export const GRADES: CurriculumGrade[] = [
  {
    id: '10',
    name: 'Grade 10',
    topics: [
      {
        id: 'algebra',
        name: 'Algebra',
        exercises: [
          { id: 'ex-1', question: 'Solve: 2x + 3 = 7', correctAnswer: '2' },
          { id: 'ex-4', question: 'What is 5 factorial (5!)?', correctAnswer: '120' },
          {
            id: 'ex-5',
            question: 'Simplify: (x^2 - 1)/(x - 1)',
            correctAnswer: 'x + 1',
          },
        ],
      },
    ],
  },
  {
    id: '12',
    name: 'Grade 12',
    topics: [
      {
        id: 'calculus',
        name: 'Calculus',
        exercises: [
          { id: 'ex-2', question: 'Derivative of x^2?', correctAnswer: '2x' },
          {
            id: 'ex-3',
            question: 'Integral of 1/x dx?',
            correctAnswer: 'ln|x| + C',
          },
        ],
      },
    ],
  },
];
