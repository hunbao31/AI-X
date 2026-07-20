'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSounds } from '@/lib/sounds';
import { overlayFade, springBouncy } from '@/lib/animations';
import { MascotImage } from '@/components/mascot/MascotImage';

interface ConfettiPiece {
  id: number;
  left: number; // vw %
  delay: number;
  duration: number;
  drift: number; // px sideways
  rotate: number;
  size: number;
  color: string;
}

const CONFETTI_COLORS = [
  '#818cf8', // indigo
  '#c084fc', // purple
  '#fbbf24', // amber
  '#34d399', // green
  '#f472b6', // pink
  '#38bdf8', // sky
];

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.4 + Math.random() * 1.2,
    drift: (Math.random() - 0.5) * 160,
    rotate: (Math.random() - 0.5) * 720,
    size: 6 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
}

interface LevelUpOverlayProps {
  level: number;
  onClose: () => void;
}

// Full-screen celebration. Confetti pieces are one-shot tween transforms
// (transform + opacity only — cheap); the title springs in from 0.8 with a
// bouncy single-target spring, whose natural overshoot gives the
// 0.8 → ~1.2 → 1 feel without keyframe arrays.
export function LevelUpOverlay({ level, onClose }: LevelUpOverlayProps) {
  const { playLevelUp } = useSounds();
  const confetti = useMemo(() => makeConfetti(36), []);

  useEffect(() => {
    playLevelUp();
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [playLevelUp, onClose]);

  return (
    <motion.div
      variants={overlayFade}
      initial="hidden"
      animate="show"
      exit="exit"
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-slate-950/80 backdrop-blur-sm"
    >
      {confetti.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ y: '-12vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '112vh', x: piece.drift, rotate: piece.rotate, opacity: 0.2 }}
          transition={{
            type: 'tween',
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeIn',
          }}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springBouncy, damping: 11 }}
        className="text-center"
      >
        {/* Koaly leads the celebration */}
        <div className="mascot-glow mx-auto mb-5 w-fit rounded-full">
          <MascotImage expression="excited" size={140} />
        </div>
        <p className="levelup-glow bg-gradient-to-r from-indigo-300 via-purple-300 to-amber-300 bg-clip-text text-6xl font-black tracking-tight text-transparent">
          LEVEL UP!
        </p>
        <p className="mt-4 text-xl font-semibold text-white">
          You reached <span className="text-amber-300">Level {level}</span>
        </p>
        <p className="mt-6 text-xs uppercase tracking-widest text-slate-400">
          Click anywhere to continue
        </p>
      </motion.div>
    </motion.div>
  );
}
