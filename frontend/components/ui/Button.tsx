'use client';

import { ButtonHTMLAttributes, forwardRef, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useClickSound } from '@/lib/useClickSound';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
  secondary:
    'bg-white/10 text-white border border-white/20 backdrop-blur-xl hover:bg-white/20',
  danger:
    'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', onClick, disabled, ...props }, ref) => {
    const playClick = useClickSound();

    function handleClick(e: MouseEvent<HTMLButtonElement>) {
      if (!disabled) playClick();
      onClick?.(e);
    }

    return (
      <motion.button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.04, y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
