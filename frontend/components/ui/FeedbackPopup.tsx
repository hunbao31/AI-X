'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { springBouncy } from '@/lib/animations';

export interface PopupState {
  correct: boolean;
  xp: number | null; // null → no XP line (e.g. exam or unknown)
  combo: number;
}

interface FeedbackPopupProps {
  popup: PopupState | null;
}

// Center-screen verdict flash: pops in with a bouncy spring, fades out fast.
// Pointer-events pass through so it never blocks the next tap.
export function FeedbackPopup({ popup }: FeedbackPopupProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <AnimatePresence>
        {popup && (
          <motion.div
            key={`${popup.correct}-${popup.xp}-${popup.combo}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: springBouncy }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.18 } }}
            className={`rounded-2xl border px-8 py-4 text-center shadow-2xl backdrop-blur-xl ${
              popup.correct
                ? 'border-green-400/50 bg-green-500/20 shadow-green-500/30'
                : 'border-red-400/50 bg-red-500/20 shadow-red-500/30'
            }`}
          >
            <p
              className={`text-3xl font-black ${
                popup.correct ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {popup.correct ? 'Chính xác!' : 'Sai rồi!'}
            </p>
            {popup.correct && popup.xp !== null && (
              <p className="xp-glow mt-1 text-lg font-bold text-amber-300">
                +{popup.xp} XP
                {popup.combo >= 3 && (
                  <span className="ml-2 text-sm font-semibold text-orange-300">
                    🔥 {popup.combo} combo
                  </span>
                )}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
