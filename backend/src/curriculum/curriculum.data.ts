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
    name: 'Lớp 10',
    topics: [
      {
        id: 'algebra',
        name: 'Đại số',
        exercises: [
          { id: 'ex-1', question: 'Giải: 2x + 3 = 7', correctAnswer: '2' },
          { id: 'ex-4', question: '5 giai thừa (5!) bằng bao nhiêu?', correctAnswer: '120' },
          {
            id: 'ex-5',
            question: 'Rút gọn: (x^2 - 1)/(x - 1)',
            correctAnswer: 'x + 1',
          },
        ],
      },
    ],
  },
  {
    id: '12',
    name: 'Lớp 12',
    topics: [
      {
        id: 'calculus',
        name: 'Giải tích',
        exercises: [
          { id: 'ex-2', question: 'Đạo hàm của x^2 là gì?', correctAnswer: '2x' },
          {
            id: 'ex-3',
            question: 'Nguyên hàm của 1/x dx là gì?',
            correctAnswer: 'ln|x| + C',
          },
        ],
      },
    ],
  },
];
