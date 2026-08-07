'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/lib/theme';
import { useClickSound } from '@/lib/useClickSound';
import { springSmooth } from '@/lib/animations';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const playClick = useClickSound();

  function handleClick() {
    playClick();
    toggleTheme();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={springSmooth}
      aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg backdrop-blur-xl transition-colors duration-200 hover:bg-white/10 ${className}`}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </motion.button>
  );
}
