import type { Transition, Variants, TargetAndTransition } from 'framer-motion';

// Reusable animation vocabulary. Rules that keep it smooth AND crash-free:
// - Springs animate to a SINGLE target value (framer springs support at most
//   2 keyframes, so `scale: [1, 1.06, 1]`-style arrays are banned here).
//   "Bounce" comes from a low-damping spring overshooting its target.
// - Multi-keyframe sequences (shake) explicitly use tween, where keyframe
//   arrays are fully supported.
// - Only transform/opacity/box-shadow are animated — GPU-cheap, 60fps.

// --- Springs ---

/** Default interactive spring — smooth, not stiff. */
export const springSmooth: Transition = { type: 'spring', stiffness: 260, damping: 20 };

/** Playful spring with visible overshoot ("bounce"). */
export const springBouncy: Transition = { type: 'spring', stiffness: 500, damping: 15 };

/** Slow settle for large surfaces (panels, overlays). */
export const springGentle: Transition = { type: 'spring', stiffness: 170, damping: 26 };

// --- Entrance variants ---

/** Parent wrapper that staggers its children by 50ms. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Card entrance: fade + slide up. Pair with staggerContainer. */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/** Side panel entrance (e.g. dashboard leaderboard) from the left. */
export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/** Reward pop: scales in with a bounce. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: springBouncy },
};

/** Full-screen overlay backdrop. */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

// --- Quiz question hand-off: new slides in from the right while the old
// one exits left (use inside <AnimatePresence mode="wait">). ---

export const questionSlide: Variants = {
  enter: { opacity: 0, x: 48 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -48, transition: { duration: 0.22, ease: 'easeIn' } },
};

// --- Answer feedback ---

/** Wrong answer: horizontal shake. Tween keyframes (NOT a spring). */
export const shakeAnimation: TargetAndTransition = {
  x: [0, -8, 8, -5, 5, 0],
  transition: { type: 'tween', duration: 0.4, ease: 'easeInOut' },
};

/** Correct answer: bouncy grow to a single target (spring-safe). */
export const correctPop: TargetAndTransition = {
  scale: 1.05,
  transition: springBouncy,
};

// --- Button glow (hover box-shadows per variant) ---

export const buttonGlow: Record<string, string> = {
  primary: '0 0 22px rgba(99, 102, 241, 0.5)',
  secondary: '0 0 18px rgba(148, 163, 184, 0.35)',
  danger: '0 0 18px rgba(248, 113, 113, 0.4)',
  ghost: '0 0 14px rgba(148, 163, 184, 0.25)',
};
