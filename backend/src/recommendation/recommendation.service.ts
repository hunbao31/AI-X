import { Injectable } from '@nestjs/common';
import { TopicAnalytics } from '../analytics/analytics.service';

export interface Recommendation {
  message: string;
  nextAction: string;
}

export type RecommendedAction = 'repeat' | 'practice' | 'advance';

export interface TopicRecommendation {
  topic: string;
  masteryScore: number;
  correctRate: number;
  attempts: number;
  action: RecommendedAction;
  message: string;
}

const LOW_THRESHOLD = 30;
const HIGH_THRESHOLD = 70;
const WEAK_CORRECT_RATE = 50;

// Rule-based only, no ML — per Step 7 simplification rules.
@Injectable()
export class RecommendationService {
  getRecommendation(score: number): Recommendation {
    if (score < LOW_THRESHOLD) {
      return { message: 'Ôn tập kiến thức cơ bản', nextAction: 'Làm lại bài tập này' };
    }

    if (score <= HIGH_THRESHOLD) {
      return { message: 'Luyện tập thêm', nextAction: 'Thử một bài tập tương tự' };
    }

    return { message: 'Nâng cao', nextAction: 'Thử một bài tập khó hơn' };
  }

  // Adaptive rule: getting answers wrong (low correct rate) or low mastery
  // → repeat the topic before moving on.
  getTopicRecommendations(breakdown: TopicAnalytics[]): TopicRecommendation[] {
    return breakdown.map((item) => {
      let action: RecommendedAction;
      let message: string;

      if (item.correctRate < WEAK_CORRECT_RATE || item.masteryScore < LOW_THRESHOLD) {
        action = 'repeat';
        message = 'Bạn đã trả lời sai nhiều câu ở đây — hãy ôn lại chủ đề này.';
      } else if (item.masteryScore <= HIGH_THRESHOLD) {
        action = 'practice';
        message = 'Tiến bộ tốt — hãy tiếp tục luyện tập để thành thạo.';
      } else {
        action = 'advance';
        message = 'Đã thành thạo — hãy chuyển sang nội dung khó hơn.';
      }

      return {
        topic: item.topic,
        masteryScore: item.masteryScore,
        correctRate: item.correctRate,
        attempts: item.attempts,
        action,
        message,
      };
    });
  }
}
