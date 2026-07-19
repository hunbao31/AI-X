'use client';

import { useCallback, useRef } from 'react';

// Synthesized via Web Audio API instead of an audio file: no asset to
// load/decode (so no delay on first click), nothing to fetch, and full
// control over how quiet/soft it is. A single AudioContext is created
// lazily on first use and reused — browsers require it to start/resume
// from a real user gesture, which a click already is.
export function useClickSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playClick = useCallback(() => {
    if (typeof window === 'undefined') return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.05);

    // Low, pleasant volume — a soft tick, not a beep.
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }, []);

  return playClick;
}
