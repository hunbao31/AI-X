'use client';

import { forwardRef, MouseEvent } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useSounds } from '@/lib/sounds';
import { springSmooth, buttonGlow } from '@/lib/animations';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

// Extending HTMLMotionProps<'button'> (not React.ButtonHTMLAttributes) is the
// correct fix for the motion.button typing conflict: framer-motion redefines
// onAnimationStart/onDrag/onDragStart/onDragEnd, so intersecting with React's
// native button props produces incompatible signatures. HTMLMotionProps is
// already that reconciliation — and it keeps every native prop (id, form,
// aria-*, data-*) available.
export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25',
  secondary: 'bg-white/10 text-white border border-white/20 backdrop-blur-xl',
  danger: 'bg-red-500/10 text-red-300 border border-red-500/30',
  ghost: 'bg-transparent text-slate-300',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      className = '',
      onClick,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const { playClick, playHover } = useSounds();

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
        // Single-value targets only — springs support at most 2 keyframes,
        // so animation targets in this codebase never use keyframe arrays.
        // Hover adds a soft glow; the smooth (not stiff) spring keeps it
        // feeling fluid.
        whileHover={
          !disabled ? { scale: 1.05, boxShadow: buttonGlow[variant] } : undefined
        }
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        onHoverStart={!disabled ? playHover : undefined}
        transition={springSmooth}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
