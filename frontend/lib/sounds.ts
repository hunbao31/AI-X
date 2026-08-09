'use client';

import { useMemo } from 'react';

// Game sound system, synthesized with the Web Audio API — zero assets to
// load, instant playback, tiny code. One AudioContext is shared app-wide and
// created lazily on the first user gesture (browsers require that anyway).

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === 'suspended') void sharedContext.resume();
  return sharedContext;
}

interface ToneOptions {
  freq: number;
  at: number; // seconds relative to ctx.currentTime
  duration: number;
  type?: OscillatorType;
  peak?: number;
  glideTo?: number;
}

function tone(
  ctx: AudioContext,
  { freq, at, duration, type = 'sine', peak = 0.06, glideTo }: ToneOptions,
): void {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  }

  // Fast attack, exponential decay — soft and clicky, never harsh.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export interface Sounds {
  /** Light tap — every button/click. */
  playClick: () => void;
  /** Barely-there tick — hovering interactive elements. */
  playHover: () => void;
  /** Quick swoosh — question transitions. */
  playWhoosh: () => void;
  /** Soft single pop — content created (forum post published). */
  playPop: () => void;
  /** Short coin-like chime — a small XP reward (upvote received, etc). */
  playReward: () => void;
  /** Rising major arpeggio — correct answer. */
  playCorrect: () => void;
  /** Low descending buzz — wrong answer. */
  playWrong: () => void;
  /** Two-note chime — climbing the leaderboard. */
  playRankUp: () => void;
  /** Short fanfare — level up / big reward. */
  playLevelUp: () => void;
}

function buildSounds(): Sounds {
  return {
    playClick: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 880, at: 0, duration: 0.08, glideTo: 440, peak: 0.05 });
    },

    playHover: () => {
      const ctx = getContext();
      if (!ctx) return;
      // Extremely quiet and short — felt more than heard.
      tone(ctx, { freq: 1320, at: 0, duration: 0.04, glideTo: 1100, peak: 0.012 });
    },

    playWhoosh: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 720, at: 0, duration: 0.14, glideTo: 220, type: 'triangle', peak: 0.035 });
      tone(ctx, { freq: 520, at: 0.02, duration: 0.12, glideTo: 180, type: 'sine', peak: 0.025 });
    },

    playPop: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 660, at: 0, duration: 0.09, glideTo: 880, peak: 0.045 });
    },

    playReward: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 880, at: 0, duration: 0.1, type: 'triangle', peak: 0.05 });
      tone(ctx, { freq: 1318.5, at: 0.07, duration: 0.16, type: 'triangle', peak: 0.055 });
    },

    playRankUp: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 659.25, at: 0, duration: 0.14, type: 'triangle', peak: 0.06 }); // E5
      tone(ctx, { freq: 987.77, at: 0.11, duration: 0.28, type: 'triangle', peak: 0.065 }); // B5
      tone(ctx, { freq: 1975.5, at: 0.11, duration: 0.2, peak: 0.018 }); // sparkle
    },

    playCorrect: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 523.25, at: 0, duration: 0.14, peak: 0.055 }); // C5
      tone(ctx, { freq: 659.25, at: 0.09, duration: 0.14, peak: 0.055 }); // E5
      tone(ctx, { freq: 783.99, at: 0.18, duration: 0.2, peak: 0.06 }); // G5
    },

    playWrong: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 196, at: 0, duration: 0.12, type: 'square', peak: 0.04 }); // G3
      tone(ctx, { freq: 147, at: 0.12, duration: 0.22, type: 'square', peak: 0.045 }); // D3
    },

    playLevelUp: () => {
      const ctx = getContext();
      if (!ctx) return;
      tone(ctx, { freq: 523.25, at: 0, duration: 0.16, type: 'triangle', peak: 0.06 });
      tone(ctx, { freq: 659.25, at: 0.1, duration: 0.16, type: 'triangle', peak: 0.06 });
      tone(ctx, { freq: 783.99, at: 0.2, duration: 0.16, type: 'triangle', peak: 0.06 });
      tone(ctx, { freq: 1046.5, at: 0.32, duration: 0.42, type: 'triangle', peak: 0.07 });
      // Sparkle an octave up on the landing note.
      tone(ctx, { freq: 2093, at: 0.32, duration: 0.3, peak: 0.02 });
    },
  };
}

export function useSounds(): Sounds {
  // Stable identities — safe to list in effect/callback deps.
  return useMemo(buildSounds, []);
}
