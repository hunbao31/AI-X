'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { fadeSlideUp } from '@/lib/animations';
import type { MarketplaceSet, SetSummary, SetDetail } from '@/lib/types';

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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<SetDetail['questions'] | null>(null);
  const [previewError, setPreviewError] = useState('');

  function togglePreview() {
    setPreviewOpen((prev) => !prev);
    if (!previewOpen && previewQuestions === null) {
      setPreviewLoading(true);
      setPreviewError('');
      apiGet<SetDetail>(`/api/v1/sets/${set.id}`)
        .then((detail) => setPreviewQuestions(detail.questions))
        .catch((err) =>
          setPreviewError(err instanceof Error ? err.message : 'Không thể tải câu hỏi.'),
        )
        .finally(() => setPreviewLoading(false));
    }
  }

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
        <button type="button" onClick={togglePreview} className="flex w-full items-start justify-between gap-2 text-left">
          <h3 className="font-semibold text-white hover:text-indigo-200">{set.title}</h3>
          <Badge tone={set.mode === 'exam' ? 'red' : 'green'}>
            {MODE_LABELS[set.mode] ?? set.mode}
          </Badge>
        </button>
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
        <button
          type="button"
          onClick={togglePreview}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
        >
          {previewOpen ? 'Ẩn câu hỏi' : 'Xem câu hỏi'}
        </button>
        {previewOpen && (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
            {previewLoading ? (
              <p className="text-xs text-slate-500">Đang tải…</p>
            ) : previewError ? (
              <p className="text-xs text-red-400">{previewError}</p>
            ) : (
              previewQuestions?.map((q, i) => (
                <p key={q.exerciseId} className="text-xs text-slate-300">
                  {i + 1}. {q.question}
                </p>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button onClick={handleImport} disabled={importing} className="w-full">
        {importing ? 'Đang thêm…' : '⬇ Thêm vào kho đề của tôi'}
      </Button>
    </motion.div>
  );
}
