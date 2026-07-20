// Badge catalog — computed on the fly from existing aggregates, so there is
// no award table to backfill and badges stay consistent with the data.

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface BadgeInputs {
  xp: number;
  level: number;
  streak: number;
  attempts: number;
  correct: number;
  quizzesCompleted: number;
  distinctTopics: number;
}

export function computeBadges(i: BadgeInputs): Badge[] {
  const accuracy = i.attempts > 0 ? (i.correct / i.attempts) * 100 : 0;

  return [
    {
      id: 'first-steps',
      name: 'First Steps',
      description: 'Answer your first question',
      icon: '🎯',
      earned: i.attempts >= 1,
    },
    {
      id: 'quiz-rookie',
      name: 'Quiz Rookie',
      description: 'Finish your first quiz',
      icon: '🏁',
      earned: i.quizzesCompleted >= 1,
    },
    {
      id: 'quiz-master',
      name: 'Quiz Master',
      description: 'Finish 10 quizzes',
      icon: '🏆',
      earned: i.quizzesCompleted >= 10,
    },
    {
      id: 'on-fire',
      name: 'On Fire',
      description: 'Reach a 7-day streak',
      icon: '🔥',
      earned: i.streak >= 7,
    },
    {
      id: 'iron-will',
      name: 'Iron Will',
      description: 'Reach a 30-day streak',
      icon: '💎',
      earned: i.streak >= 30,
    },
    {
      id: 'point-collector',
      name: 'Point Collector',
      description: 'Earn 500 XP',
      icon: '⚡',
      earned: i.xp >= 500,
    },
    {
      id: 'high-five',
      name: 'High Five',
      description: 'Reach level 5',
      icon: '⭐',
      earned: i.level >= 5,
    },
    {
      id: 'sharpshooter',
      name: 'Sharpshooter',
      description: '90%+ accuracy over 20+ answers',
      icon: '🏹',
      earned: i.attempts >= 20 && accuracy >= 90,
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Practice 3 different topics',
      icon: '🧭',
      earned: i.distinctTopics >= 3,
    },
  ];
}
