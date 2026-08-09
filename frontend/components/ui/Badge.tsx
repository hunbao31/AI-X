import { HTMLAttributes } from 'react';

type Tone = 'green' | 'yellow' | 'red' | 'slate' | 'indigo';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  green: 'bg-green-500/15 text-green-300 border border-green-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  red: 'bg-red-500/15 text-red-300 border border-red-500/30',
  slate: 'bg-white/10 text-slate-300 border border-white/20',
  indigo: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
};

export function Badge({ tone = 'slate', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
