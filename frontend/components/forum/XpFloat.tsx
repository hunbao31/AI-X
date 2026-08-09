'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { springBouncy } from '@/lib/animations';

export interface XpFloatState {
  id: number;
  amount: number;
}

interface XpFloatProps {
  state: XpFloatState | null;
  className?: string;
}

// "+N XP" that pops up near the action that earned it, drifts up, and
// fades — the parent clears `state` on a timer (same pattern as
// components/ui/FeedbackPopup.tsx).
export function XpFloat({ state, className = '' }: XpFloatProps) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <AnimatePresence>
        {state && (
          <motion.span
            key={state.id}
            initial={{ opacity: 0, y: 6, scale: 0.7 }}
            animate={{ opacity: 1, y: -20, scale: 1, transition: springBouncy }}
            exit={{ opacity: 0, y: -36, transition: { duration: 0.45 } }}
            className="xp-glow whitespace-nowrap text-lg font-extrabold text-amber-300"
          >
            +{state.amount} XP
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
