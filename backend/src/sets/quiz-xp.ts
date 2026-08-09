// Quiz XP formula — pure and deterministic so the frontend can mirror it for
// instant "+N XP" popups while this stays the authoritative version.
//
//   base 10 XP per correct answer (3 for wrong — participation)
//   combo multiplier: 3+ consecutive correct → x1.2, 5+ → x1.5
//   speed bonus (timed sets only): up to +50%, linear — answering instantly
//   doubles half the base, answering at the buzzer adds nothing.

export const QUIZ_XP_BASE_CORRECT = 10;
export const QUIZ_XP_BASE_WRONG = 3;

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

// `combo` counts consecutive correct answers INCLUDING the current one.
export function questionXp(
  correct: boolean,
  combo: number,
  timeMs: number | null | undefined,
  timeLimitSeconds: number | null,
): number {
  if (!correct) return QUIZ_XP_BASE_WRONG;
  return Math.round(
    QUIZ_XP_BASE_CORRECT * comboMultiplier(combo) * speedFactor(timeMs, timeLimitSeconds),
  );
}
