'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { fadeSlideUp } from '@/lib/animations';
import type { MarketplaceSet, SetSummary } from '@/lib/types';

interface MarketplaceCardProps {
  set: MarketplaceSet;
}

// Display-only label for the raw `mode` enum rendered directly in JSX —
// comparisons elsewhere stay on the original English values.
const MODE_LABELS: Record<string, string> = {
  practice: 'Luyện tập',
  exam: 'Kiểm tra',
};

export function MarketplaceCard({ set }: MarketplaceCardProps) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      const copy = await apiPost<SetSummary>(`/api/v1/sets/${set.id}/import`, {});
      // Straight into the builder for the new copy — importing is the start
      // of editing it, not the end of the interaction.
      router.push(`/teacher/sets/${copy.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhập.');
      setImporting(false);
    }
  }

  return (
    <motion.div
      variants={fadeSlideUp}
      className="flex flex-col justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white">{set.title}</h3>
          <Badge tone={set.mode === 'exam' ? 'red' : 'green'}>
            {MODE_LABELS[set.mode] ?? set.mode}
          </Badge>
        </div>
        {set.description && (
          <p className="line-clamp-2 text-sm text-slate-400">{set.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Avatar id={set.creator.avatar} size={20} />
          <span>{set.creator.username}</span>
          <span>·</span>
          <span>{set._count.items} câu hỏi</span>
          <span>·</span>
          <span>{set._count.attempts} lượt chơi</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button onClick={handleImport} disabled={importing} className="w-full">
        {importing ? 'Đang nhập…' : '⬇ Nhập vào ngân hàng của tôi'}
      </Button>
    </motion.div>
  );
}
