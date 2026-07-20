// Koaly expression registry. Keys map 1:1 to the mascot sprite sheet
// (numbers reference the "BIỂU CẢM" board the art team delivered):
//
//   excited(1)  awesome(2)  thinking(3)  curious(4)   surprised(5)  proud(6)
//   focused(7)  determined(8)            confused(10) cool(11)      sleepy(12)
//   cheer(13)   oops(14)    gotit(15)    love(16)     wave(17)
//
// Real artwork: drop PNG crops into  public/mascot/<skin>/<key>.png
// (default skin "classic"). Until a file exists, the built-in SVG Koaly
// placeholder renders — the swap is automatic, no code changes.

export type MascotExpression =
  | 'excited'
  | 'awesome'
  | 'thinking'
  | 'curious'
  | 'surprised'
  | 'proud'
  | 'focused'
  | 'determined'
  | 'confused'
  | 'cool'
  | 'sleepy'
  | 'cheer'
  | 'oops'
  | 'gotit'
  | 'love'
  | 'wave';

export const MASCOT_EXPRESSIONS: MascotExpression[] = [
  'excited',
  'awesome',
  'thinking',
  'curious',
  'surprised',
  'proud',
  'focused',
  'determined',
  'confused',
  'cool',
  'sleepy',
  'cheer',
  'oops',
  'gotit',
  'love',
  'wave',
];

// Skins are a future unlockable — everything resolves through this so a new
// folder of PNGs is all a skin needs.
export type MascotSkin = 'classic';
export const DEFAULT_SKIN: MascotSkin = 'classic';

export function mascotSrc(skin: MascotSkin, expression: MascotExpression): string {
  return `/mascot/${skin}/${expression}.png`;
}

// How the widget moves while a reaction plays. All presets are transform-only
// and spring-safe (single-target springs; keyframe arrays are tween-driven).
export type MascotMotion = 'none' | 'jump' | 'shake' | 'wave' | 'drop';

export type MascotMood = 'idle' | 'thinking' | 'sleepy' | 'happy' | 'determined';

// Persistent baseline per mood (what Koaly shows between reactions).
export const MOOD_EXPRESSION: Record<MascotMood, MascotExpression> = {
  idle: 'excited',
  thinking: 'thinking',
  sleepy: 'sleepy',
  happy: 'awesome',
  determined: 'determined',
};

export type MascotReactionType =
  | 'correct'
  | 'fastCorrect'
  | 'streak'
  | 'wrong'
  | 'confusedRun'
  | 'celebrate'
  | 'encourage'
  | 'rankUp'
  | 'top3'
  | 'greet'
  | 'gotit'
  | 'love';

export interface MascotReactionPreset {
  expression: MascotExpression;
  motion: MascotMotion;
  // Default bubble text; call sites can override (e.g. "+18 XP").
  bubble: string | null;
  durationMs: number;
  glow: boolean;
}

export const REACTION_PRESETS: Record<MascotReactionType, MascotReactionPreset> = {
  correct: { expression: 'awesome', motion: 'jump', bubble: 'Awesome!', durationMs: 1600, glow: false },
  fastCorrect: { expression: 'proud', motion: 'jump', bubble: 'So fast! ⚡', durationMs: 1600, glow: false },
  streak: { expression: 'determined', motion: 'jump', bubble: 'On fire! 🔥', durationMs: 1800, glow: true },
  wrong: { expression: 'oops', motion: 'shake', bubble: 'Oops!', durationMs: 1600, glow: false },
  confusedRun: { expression: 'confused', motion: 'drop', bubble: "Let's slow down 🤔", durationMs: 2200, glow: false },
  celebrate: { expression: 'excited', motion: 'jump', bubble: 'Amazing! 🎉', durationMs: 2400, glow: true },
  encourage: { expression: 'cheer', motion: 'wave', bubble: 'You got this!', durationMs: 2400, glow: false },
  rankUp: { expression: 'proud', motion: 'jump', bubble: 'Climbing! 📈', durationMs: 2000, glow: false },
  top3: { expression: 'cool', motion: 'jump', bubble: 'TOP 3! 😎', durationMs: 2600, glow: true },
  greet: { expression: 'wave', motion: 'wave', bubble: 'Hi!', durationMs: 2600, glow: false },
  gotit: { expression: 'gotit', motion: 'jump', bubble: 'Got it! 💡', durationMs: 1600, glow: false },
  love: { expression: 'love', motion: 'jump', bubble: 'Love it! ❤️', durationMs: 2000, glow: false },
};
