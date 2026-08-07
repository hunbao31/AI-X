'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { AVATARS } from '@/lib/avatars';
import { useClickSound } from '@/lib/useClickSound';
import { springSmooth } from '@/lib/animations';

interface AvatarSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

// Preset grid: click to choose, spring-highlighted selection ring.
export function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  const playClick = useClickSound();

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {AVATARS.map((preset) => {
        const isSelected = preset.id === selected;
        return (
          <motion.button
            key={preset.id}
            type="button"
            onClick={() => {
              playClick();
              onSelect(preset.id);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: isSelected ? 1.05 : 1 }}
            transition={springSmooth}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors duration-200 ${
              isSelected
                ? 'border-indigo-400/70 bg-indigo-500/20 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <Avatar id={preset.id} size={56} />
            <span
              className={`text-xs font-medium ${
                isSelected ? 'text-white' : 'text-slate-400'
              }`}
            >
              {preset.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
