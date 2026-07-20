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
      return { message: 'Review basics', nextAction: 'Retry this exercise' };
    }

    if (score <= HIGH_THRESHOLD) {
      return { message: 'Practice more', nextAction: 'Try a similar exercise' };
    }

    return { message: 'Advance', nextAction: 'Try a harder exercise' };
  }

  // Adaptive rule: getting answers wrong (low correct rate) or low mastery
  // → repeat the topic before moving on.
  getTopicRecommendations(breakdown: TopicAnalytics[]): TopicRecommendation[] {
    return breakdown.map((item) => {
      let action: RecommendedAction;
      let message: string;

      if (item.correctRate < WEAK_CORRECT_RATE || item.masteryScore < LOW_THRESHOLD) {
        action = 'repeat';
        message = 'You missed several questions here — repeat this topic.';
      } else if (item.masteryScore <= HIGH_THRESHOLD) {
        action = 'practice';
        message = 'Solid progress — keep practicing to build mastery.';
      } else {
        action = 'advance';
        message = 'Mastered — move on to harder material.';
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
