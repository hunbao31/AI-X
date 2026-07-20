'use client';

import { useEffect, useState } from 'react';
import { KoalyFace } from './KoalyFace';
import {
  MascotExpression,
  MascotSkin,
  DEFAULT_SKIN,
  mascotSrc,
} from './expressions';

// Renders the sprite PNG for an expression when it exists under
// /public/mascot/<skin>/, otherwise the built-in vector Koaly. Probe results
// are cached module-wide so each file is checked at most once per session —
// no repeat 404s, no flicker when expressions switch.
const probeCache = new Map<string, boolean>();

function useSpriteAvailable(src: string): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(
    probeCache.has(src) ? (probeCache.get(src) as boolean) : null,
  );

  useEffect(() => {
    if (probeCache.has(src)) {
      setAvailable(probeCache.get(src) as boolean);
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

interface MascotImageProps {
  expression: MascotExpression;
  size: number;
  skin?: MascotSkin;
  className?: string;
}

export function MascotImage({
  expression,
  size,
  skin = DEFAULT_SKIN,
  className = '',
}: MascotImageProps) {
  const src = mascotSrc(skin, expression);
  const available = useSpriteAvailable(src);

  if (available) {
    return (
      // Plain <img>: local static asset, exact pixel size, no next/image
      // loader indirection needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        width={size}
        height={size}
        alt={`Koaly ${expression}`}
        draggable={false}
        className={`select-none object-contain ${className}`}
      />
    );
  }

  // Unknown (probing) or missing → vector fallback; identical footprint so
  // nothing shifts when the probe resolves.
  return (
    <span className={`inline-block select-none ${className}`}>
      <KoalyFace expression={expression} size={size} />
    </span>
  );
}
