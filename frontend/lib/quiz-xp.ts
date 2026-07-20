// Client mirror of backend/src/sets/quiz-xp.ts — used ONLY to show the
// projected "+N XP" popup instantly; the server recomputes the authoritative
// value at submit from the same inputs. Keep both files in sync.

export function comboMultiplier(combo: number): number {
  if (combo >= 5) return 1.5;
  if (combo >= 3) return 1.2;
  return 1;
}

export function speedFactor(
  timeMs: number | null | undefined,
  timeLimitSeconds: number | null,
): number {
  if (
    timeLimitSeconds === null ||
    timeMs === null ||
    timeMs === undefined ||
    !Number.isFinite(timeMs) ||
    timeMs < 0
  ) {
    return 1;
  }
  const fractionLeft = 1 - timeMs / 1000 / timeLimitSeconds;
  return 1 + 0.5 * Math.min(1, Math.max(0, fractionLeft));
}

export function questionXp(
  correct: boolean,
  combo: number,
  timeMs: number | null | undefined,
  timeLimitSeconds: number | null,
): number {
  if (!correct) return 3;
  return Math.round(10 * comboMultiplier(combo) * speedFactor(timeMs, timeLimitSeconds));
}
