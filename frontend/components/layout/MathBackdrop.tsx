'use client';

import { motion } from 'framer-motion';

// Very slow drift loop: single-target values with repeatType "mirror" — two
// implicit keyframes, so it stays spring-rule-safe and GPU-cheap (transform
// only). Durations are long on purpose; the motion should be barely felt.
function drift(duration: number, y: number, rotate = 0) {
  return {
    animate: { y, rotate },
    transition: {
      duration,
      repeat: Infinity,
      repeatType: 'mirror' as const,
      ease: 'easeInOut' as const,
    },
  };
}

export function MathBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* faint graph-paper grid (line color flips with the theme) */}
      <div className="backdrop-grid absolute inset-0 opacity-[0.04]" />

      {/* floating geometric shapes */}
      <motion.svg
        {...drift(26, -18, 4)}
        className="absolute -left-16 -top-16 h-72 w-72 text-indigo-400/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" />
      </motion.svg>
      <motion.svg
        {...drift(32, 16, -5)}
        className="absolute -bottom-20 -right-10 h-80 w-80 text-purple-400/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <polygon points="50,5 95,95 5,95" stroke="currentColor" strokeWidth="1.5" />
      </motion.svg>
      <motion.svg
        {...drift(24, -12, 6)}
        className="absolute right-[6%] top-[55%] h-40 w-40 text-amber-300/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <rect x="10" y="10" width="80" height="80" rx="8" stroke="currentColor" strokeWidth="1.5" />
      </motion.svg>

      {/* chalk-style dashed circle */}
      <motion.svg
        {...drift(38, 14, -8)}
        className="absolute left-[30%] bottom-[8%] h-52 w-52 text-indigo-300/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
      </motion.svg>

      {/* ruler */}
      <motion.svg
        {...drift(30, -10, 3)}
        className="absolute left-[6%] top-[22%] h-16 w-64 text-purple-300/10"
        viewBox="0 0 200 40"
        fill="none"
      >
        <rect x="2" y="8" width="196" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
        {Array.from({ length: 19 }, (_, i) => {
          const x = 12 + i * 10;
          const tall = i % 5 === 0;
          return (
            <line
              key={x}
              x1={x}
              y1={8}
              x2={x}
              y2={tall ? 22 : 16}
              stroke="currentColor"
              strokeWidth="1"
            />
          );
        })}
      </motion.svg>

      {/* floating formula glyphs */}
      <motion.span
        {...drift(22, -16, 5)}
        className="absolute right-[12%] top-[18%] select-none font-serif text-7xl text-indigo-300/[0.06]"
      >
        π
      </motion.span>
      <motion.span
        {...drift(28, 12, -4)}
        className="absolute left-[8%] bottom-[15%] select-none font-serif text-6xl text-purple-300/[0.06]"
      >
        ∑
      </motion.span>
      <motion.span
        {...drift(20, -10, 3)}
        className="absolute left-[42%] top-[10%] select-none font-serif text-5xl text-amber-200/[0.05]"
      >
        √
      </motion.span>
      <motion.span
        {...drift(34, 14, -6)}
        className="absolute left-[20%] top-[45%] select-none font-serif text-4xl text-indigo-200/[0.05]"
      >
        ∞
      </motion.span>
    </div>
  );
}
