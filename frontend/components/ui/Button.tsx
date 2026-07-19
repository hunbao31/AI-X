'use client';

import { forwardRef, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useClickSound } from '@/lib/useClickSound';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  variant?: Variant;
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25',
  secondary:
    'bg-white/10 text-white border border-white/20 backdrop-blur-xl',
  danger:
    'bg-red-500/10 text-red-300 border border-red-500/30',
  ghost: 'bg-transparent text-slate-300',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', onClick, disabled, children, type = 'button' }, ref) => {
    const playClick = useClickSound();

    function handleClick(e: MouseEvent<HTMLButtonElement>) {
      if (!disabled) playClick();
      onClick?.(e);
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={handleClick}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.04 } : undefined}
        whileTap={!disabled ? { scale: 0.96 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';