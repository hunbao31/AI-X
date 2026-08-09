'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface BurstPiece {
  id: number;
  angle: number;
  distance: number;
  rotate: number;
  size: number;
  color: string;
  duration: number;
}

const COLORS = ['#818cf8', '#c084fc', '#fbbf24', '#34d399', '#f472b6', '#38bdf8'];

function makeBurst(count: number): BurstPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    angle: (id / count) * Math.PI * 2 + Math.random() * 0.5,
    distance: 90 + Math.random() * 140,
    rotate: (Math.random() - 0.5) * 540,
    size: 5 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    duration: 0.7 + Math.random() * 0.5,
  }));
}

interface ConfettiBurstProps {
  onDone: () => void;
}

// Radial confetti explosion from screen center — one-shot, transform+opacity
// only, unmounts itself. Used for "entered top 3" moments.
export function ConfettiBurst({ onDone }: ConfettiBurstProps) {
  const pieces = useMemo(() => makeBurst(28), []);

  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(piece.angle) * piece.distance,
            y: Math.sin(piece.angle) * piece.distance + 60,
            opacity: 0,
            rotate: piece.rotate,
          }}
          transition={{ type: 'tween', duration: piece.duration, ease: 'easeOut' }}
          className="absolute rounded-sm"
          style={{
            width: piece.size,
            height: piece.size * 0.65,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  );
}
