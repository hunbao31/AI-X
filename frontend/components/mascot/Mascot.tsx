'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { TargetAndTransition } from 'framer-motion';
import { MascotImage } from './MascotImage';
import { useMascotState } from './MascotProvider';
import { MOOD_EXPRESSION, MascotMotion } from './expressions';
import { popIn } from '@/lib/animations';

// Reaction choreography. Multi-keyframe sequences are tween-driven (the
// spring-keyframe limitation doesn't apply to tweens); everything is
// transform-only so the widget never causes layout work.
const MOTION_TARGETS: Record<MascotMotion, TargetAndTransition> = {
  none: {},
  jump: {
    y: [0, -18, 0],
    scale: [1, 1.08, 1],
    transition: { type: 'tween', duration: 0.55, ease: 'easeOut' },
  },
  shake: {
    x: [0, -8, 8, -5, 5, 0],
    transition: { type: 'tween', duration: 0.45, ease: 'easeInOut' },
  },
  wave: {
    rotate: [0, -8, 8, -8, 8, 0],
    transition: { type: 'tween', duration: 0.8, ease: 'easeInOut' },
  },
  drop: {
    y: [0, 7, 0],
    transition: { type: 'tween', duration: 0.5, ease: 'easeOut' },
  },
};

// Fixed bottom-right on every student page. pointer-events-none throughout —
// Koaly can never block a tap, on any screen size.
export function Mascot() {
  const { mood, reaction, visible } = useMascotState();
  const reducedMotion = useReducedMotion();

  if (!visible) return null;

  const expression = reaction?.expression ?? MOOD_EXPRESSION[mood];

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex flex-col items-end sm:bottom-5 sm:right-5">
      {/* Speech bubble */}
      <AnimatePresence>
        {reaction?.bubble && (
          <motion.div
            key={reaction.id}
            variants={popIn}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: 6, transition: { duration: 0.2 } }}
            className="mb-2 mr-2 max-w-[180px] rounded-2xl rounded-br-sm border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-xl"
          >
            {reaction.bubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle float wrapper (skipped for reduced-motion users) */}
      <motion.div
        animate={reducedMotion ? undefined : { y: -6 }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
        className="max-sm:origin-bottom-right max-sm:scale-75"
      >
        {/* Reaction layer — keyed by reaction id so repeats replay */}
        <motion.div
          key={reaction?.id ?? 'rest'}
          animate={reaction ? MOTION_TARGETS[reaction.motion] : undefined}
          className={reaction?.glow ? 'mascot-glow rounded-full' : ''}
        >
          <MascotImage expression={expression} size={96} />
        </motion.div>
      </motion.div>
    </div>
  );
}
