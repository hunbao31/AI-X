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
      name: 'Bước Đầu Tiên',
      description: 'Trả lời câu hỏi đầu tiên của bạn',
      icon: '🎯',
      earned: i.attempts >= 1,
    },
    {
      id: 'quiz-rookie',
      name: 'Tân Binh Quiz',
      description: 'Hoàn thành bài quiz đầu tiên',
      icon: '🏁',
      earned: i.quizzesCompleted >= 1,
    },
    {
      id: 'quiz-master',
      name: 'Bậc Thầy Quiz',
      description: 'Hoàn thành 10 bài quiz',
      icon: '🏆',
      earned: i.quizzesCompleted >= 10,
    },
    {
      id: 'on-fire',
      name: 'Bùng Cháy',
      description: 'Đạt chuỗi 7 ngày',
      icon: '🔥',
      earned: i.streak >= 7,
    },
    {
      id: 'iron-will',
      name: 'Ý Chí Sắt Đá',
      description: 'Đạt chuỗi 30 ngày',
      icon: '💎',
      earned: i.streak >= 30,
    },
    {
      id: 'point-collector',
      name: 'Người Sưu Tầm Điểm',
      description: 'Kiếm được 500 XP',
      icon: '⚡',
      earned: i.xp >= 500,
    },
    {
      id: 'high-five',
      name: 'Cán Mốc Cấp 5',
      description: 'Đạt đến cấp độ 5',
      icon: '⭐',
      earned: i.level >= 5,
    },
    {
      id: 'sharpshooter',
      name: 'Thiện Xạ',
      description: 'Độ chính xác trên 90% qua hơn 20 câu trả lời',
      icon: '🏹',
      earned: i.attempts >= 20 && accuracy >= 90,
    },
    {
      id: 'explorer',
      name: 'Nhà Thám Hiểm',
      description: 'Luyện tập 3 chủ đề khác nhau',
      icon: '🧭',
      earned: i.distinctTopics >= 3,
    },
  ];
}
