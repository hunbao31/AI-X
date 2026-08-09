'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { staggerContainer, fadeSlideUp, springSmooth } from '@/lib/animations';
import type { XpLeaderboardEntry } from '@/lib/types';

interface XpLeaderboardProps {
  entries: XpLeaderboardEntry[];
  highlightUserId?: string | null;
  compact?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

// Game-style XP ranking. Top 3 get a pulsing podium glow (CSS keyframes —
// zero JS cost); rows use framer `layout` so any reorder between fetches
// animates smoothly instead of snapping.
export function XpLeaderboard({
  entries,
  highlightUserId = null,
  compact = false,
}: XpLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Chưa có điểm số nào — hãy là người đầu tiên trên bảng xếp hạng!
      </p>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {entries.map((entry) => {
        const isSelf = entry.userId === highlightUserId;
        const podium = entry.rank <= 3 ? `podium-${entry.rank}` : '';
        return (
          <motion.div
            key={entry.userId}
            layout
            variants={fadeSlideUp}
            whileHover={{ scale: 1.02 }}
            transition={springSmooth}
            className={`flex items-center justify-between rounded-xl border bg-white/5 px-4 py-2.5 ${podium} ${
              isSelf ? 'border-indigo-400/60 bg-indigo-500/15' : 'border-white/10'
            }`}
          >
            <span className="flex min-w-0 items-center gap-3 text-sm text-slate-200">
              <span className="w-8 shrink-0 font-bold text-white">
                {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
              </span>
              <Avatar id={entry.avatar} size={compact ? 26 : 32} />
              <span className="truncate font-medium">
                {entry.username}
                {isSelf && <span className="ml-2 text-xs text-indigo-300">bạn</span>}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-white">
              {entry.xp} XP
              {!compact && (
                <span className="ml-2 font-normal text-slate-400">
                  · Cấp {entry.level} · 🔥 {entry.streak}
                </span>
              )}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
