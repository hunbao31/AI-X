import { Injectable } from '@nestjs/common';

export interface Recommendation {
  message: string;
  nextAction: string;
}

const LOW_THRESHOLD = 30;
const HIGH_THRESHOLD = 70;

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
}
