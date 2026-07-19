'use client';

import { motion } from 'framer-motion';
import { useClickSound } from '@/lib/useClickSound';

interface McqOptionsProps {
  options: string[];
  selected: string | null;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function McqOptions({
  options,
  selected,
  onSelect,
  disabled,
}: McqOptionsProps) {
  const playClick = useClickSound();

  function handleSelect(option: string) {
    if (disabled) return;
    playClick();
    onSelect(option);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <motion.button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => handleSelect(option)}
            whileHover={
              disabled
                ? undefined
                : { scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 20 } }
            }
            whileTap={
              disabled
                ? undefined
                : { scale: 0.97, transition: { type: 'spring', stiffness: 400, damping: 20 } }
            }
            animate={
              isSelected
                ? { scale: [1, 1.06, 1], transition: { duration: 0.3, ease: 'easeInOut' } }
                : { scale: 1 }
            }
            className={`rounded-xl border p-4 text-left text-sm font-medium backdrop-blur-xl transition-colors duration-200 disabled:cursor-not-allowed ${
              isSelected
                ? 'border-indigo-400/60 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                : 'border-white/15 bg-white/5 text-slate-200 hover:border-indigo-400/40 hover:bg-white/10'
            }`}
          >
            {option}
          </motion.button>
        );
      })}
    </div>
  );
}
