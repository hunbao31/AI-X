import { Injectable } from '@nestjs/common';
import { GamificationStore } from './gamification.store';

export interface GamificationSummary {
  xp: number;
  level: number;
  streak: number;
}

function toSummary(record: {
  xp: number;
  level: number;
  streak: number;
}): GamificationSummary {
  return { xp: record.xp, level: record.level, streak: record.streak };
}

@Injectable()
export class GamificationService {
  constructor(private readonly gamificationStore: GamificationStore) {}

  async getSummary(userId: string): Promise<GamificationSummary> {
    return toSummary(await this.gamificationStore.getRecord(userId));
  }

  async recordAttempt(
    userId: string,
    correct: boolean,
  ): Promise<GamificationSummary> {
    return toSummary(await this.gamificationStore.recordAttempt(userId, correct));
  }
}
