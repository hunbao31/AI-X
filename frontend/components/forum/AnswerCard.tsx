'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MathText } from '@/components/ui/MathText';
import { UpvoteSparkle } from './UpvoteSparkle';
import { resolveImageUrl } from '@/lib/api';
import { timeAgo } from '@/lib/time';
import { springSmooth } from '@/lib/animations';
import type { ForumAnswer } from '@/lib/types';

interface AnswerCardProps {
  answer: ForumAnswer;
  isOwnAnswer: boolean;
  canAccept: boolean;
  onUpvote: (answerId: string) => void;
  onAccept: (answerId: string) => void;
  upvoting: boolean;
  accepting: boolean;
}

// `layout` on the outer motion.div is what makes the list reorder smoothly
// (FLIP animation) when the parent re-sorts after an upvote/accept — no
// AnimatePresence needed for that, just a stable key + the layout prop.
export function AnswerCard({
  answer,
  isOwnAnswer,
  canAccept,
  onUpvote,
  onAccept,
  upvoting,
  accepting,
}: AnswerCardProps) {
  const [showSparkle, setShowSparkle] = useState(false);

  function handleUpvoteClick() {
    if (isOwnAnswer || upvoting) return;
    if (!answer.upvotedByMe) setShowSparkle(true);
    onUpvote(answer.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: answer.isAccepted ? 1.02 : 1 }}
      transition={springSmooth}
      className={`rounded-2xl border p-4 transition-colors duration-300 ${
        answer.isAccepted
          ? 'best-answer-glow border-green-400/60 bg-green-500/10'
          : 'border-white/15 bg-white/5'
      }`}
    >
      {answer.isAccepted && (
        <div className="mb-3">
          <Badge tone="green">✓ Câu trả lời hay nhất</Badge>
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2">
        <Avatar id={answer.author.avatar} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">
            {answer.author.username}
          </p>
          <p className="text-xs text-slate-500">{timeAgo(answer.createdAt)}</p>
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-200">
        <MathText text={answer.content} />
      </div>

      {answer.imageUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImageUrl(answer.imageUrl)}
            alt="Hình minh họa câu trả lời"
            loading="lazy"
            className="max-h-64 w-full object-contain"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={handleUpvoteClick}
          disabled={isOwnAnswer || upvoting}
          whileTap={!isOwnAnswer ? { scale: 0.85 } : undefined}
          whileHover={!isOwnAnswer ? { scale: 1.05 } : undefined}
          transition={springSmooth}
          title={isOwnAnswer ? 'Bạn không thể bình chọn câu trả lời của chính mình' : 'Bình chọn'}
          className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            answer.upvotedByMe
              ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
              : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          {showSparkle && <UpvoteSparkle onDone={() => setShowSparkle(false)} />}
          <span>▲</span>
          {answer.upvoteCount}
        </motion.button>

        {canAccept && !answer.isAccepted && (
          <button
            type="button"
            onClick={() => onAccept(answer.id)}
            disabled={accepting}
            className="text-sm font-medium text-green-300 hover:text-green-200 disabled:opacity-50"
          >
            {accepting ? 'Đang đánh dấu…' : '✓ Đánh dấu là câu trả lời hay nhất'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
