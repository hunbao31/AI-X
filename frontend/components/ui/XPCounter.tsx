'use client';

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { popIn } from '@/lib/animations';

// Reward popup: "+N XP" counts up from 0 with a glow and a bouncy entrance.
export function XPCounter({ gained }: { gained: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, gained, {
      duration: Math.min(1.4, 0.4 + gained / 120),
      ease: 'easeOut',
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
  }, [gained]);

  return (
    <motion.div
      variants={popIn}
      initial="hidden"
      animate="show"
      className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-3"
    >
      <span className="text-2xl">⚡</span>
      <span className="xp-glow bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
        +{display} XP
      </span>
    </motion.div>
  );
}
