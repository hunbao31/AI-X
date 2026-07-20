'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { staggerContainer, fadeSlideUp } from '@/lib/animations';
import type { QuizHistoryEntry } from '@/lib/types';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function QuizHistoryPage() {
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<QuizHistoryEntry[]>('/api/v1/users/me/quiz-history')
      .then(setHistory)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load history.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Quiz History</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading history…</p>
      ) : history.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            No quizzes completed yet —{' '}
            <Link href="/quizzes" className="text-indigo-300 hover:text-indigo-200">
              find one to play
            </Link>
            .
          </p>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {history.map((h) => (
            <motion.div key={h.attemptId} variants={fadeSlideUp}>
              <Card className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{h.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(h.completedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {formatDuration(h.durationSeconds)}
                    {' · '}
                    <Badge tone={h.mode === 'exam' ? 'red' : 'green'} className="ml-1">
                      {h.mode}
                    </Badge>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {h.correctCount}/{h.totalCount}
                    </p>
                    <p className="text-xs text-slate-400">{h.score} pts</p>
                  </div>
                  <Link href={`/quiz/${h.setId}`}>
                    <Button variant="secondary">Replay</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
