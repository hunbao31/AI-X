import { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl transition-all duration-200 ${className}`}
      {...props}
    />
  );
}
