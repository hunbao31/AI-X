'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  angle: number;
  distance: number;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    angle: (id / count) * Math.PI * 2,
    distance: 18 + Math.random() * 14,
  }));
}

interface UpvoteSparkleProps {
  onDone: () => void;
}

// Small localized burst around the upvote button — a scaled-down cousin of
// ConfettiBurst (which explodes from screen center); this one is absolutely
// positioned within a `relative` button wrapper instead.
export function UpvoteSparkle({ onDone }: UpvoteSparkleProps) {
  const particles = useMemo(() => makeParticles(6), []);

  useEffect(() => {
    const timer = setTimeout(onDone, 500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ type: 'tween', duration: 0.45, ease: 'easeOut' }}
          className="absolute text-xs"
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}
