'use client';

// Back-compat shim — the sound system now lives in sounds.ts (click, correct,
// wrong, level-up). Existing `useClickSound()` call sites keep working.
import { useSounds } from './sounds';

export { useSounds } from './sounds';

export function useClickSound(): () => void {
  return useSounds().playClick;
}
