'use client';

import { useEffect, useState } from 'react';
import { KoalyFace } from '@/components/mascot/KoalyFace';
import { avatarPreset } from '@/lib/avatars';

// Circular profile avatar (user identity — distinct from the Koaly mascot
// assistant). Renders /avatars/<id>.png when the file exists, else the
// vector Koaly with the preset's expression. Probe results are cached
// module-wide: one check per file per session.
const probeCache = new Map<string, boolean>();

function useSpriteAvailable(src: string): boolean {
  const [available, setAvailable] = useState<boolean>(probeCache.get(src) === true);

  useEffect(() => {
    if (probeCache.has(src)) {
      setAvailable(probeCache.get(src) === true);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      probeCache.set(src, true);
      if (!cancelled) setAvailable(true);
    };
    img.onerror = () => {
      probeCache.set(src, false);
      if (!cancelled) setAvailable(false);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return available;
}

interface AvatarProps {
  id: string | null | undefined;
  /** Outer diameter in px. */
  size?: number;
  className?: string;
}

export function Avatar({ id, size = 32, className = '' }: AvatarProps) {
  const preset = avatarPreset(id);
  const src = `/avatars/${preset.id}.png`;
  const available = useSpriteAvailable(src);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 ${preset.bg} ${className}`}
      style={{ width: size, height: size }}
      title={preset.label}
    >
      {available ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          width={size}
          height={size}
          alt={`${preset.label} avatar`}
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      ) : (
        // Slight overscale crops the vector Koaly's ears into the circle
        // nicely instead of leaving empty corners.
        <span className="pointer-events-none select-none" style={{ marginTop: size * 0.08 }}>
          <KoalyFace expression={preset.expression} size={size * 1.15} />
        </span>
      )}
    </span>
  );
}
