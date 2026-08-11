'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { staggerContainer, fadeSlideUp } from '@/lib/animations';
import { MathText } from '@/components/ui/MathText';
import type { QuizHistoryEntry, MyTextAttempt } from '@/lib/types';

// Display-only labels for the QuizMode enum — comparisons elsewhere
// (e.g. h.mode === 'exam') keep using the original English values.
const MODE_LABEL: Record<string, string> = {
  practice: 'Luyện tập',
  exam: 'Kiểm tra',
};

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

  const [essays, setEssays] = useState<MyTextAttempt[]>([]);
  const [essaysLoading, setEssaysLoading] = useState(true);
  const [essaysError, setEssaysError] = useState('');

  useEffect(() => {
    apiGet<QuizHistoryEntry[]>('/api/v1/users/me/quiz-history')
      .then(setHistory)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải lịch sử.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiGet<MyTextAttempt[]>('/api/v1/attempts/mine')
      .then(setEssays)
      .catch((err) =>
        setEssaysError(err instanceof Error ? err.message : 'Không thể tải lịch sử tự luận.'),
      )
      .finally(() => setEssaysLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Lịch sử trắc nghiệm</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải lịch sử…</p>
      ) : history.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa hoàn thành bài trắc nghiệm nào —{' '}
            <Link href="/quizzes" className="text-indigo-300 hover:text-indigo-200">
              tìm một bài để chơi
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
                    {new Date(h.completedAt).toLocaleString('vi-VN', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {formatDuration(h.durationSeconds)}
                    {' · '}
                    <Badge tone={h.mode === 'exam' ? 'red' : 'green'} className="ml-1">
                      {MODE_LABEL[h.mode] ?? h.mode}
                    </Badge>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {h.correctCount}/{h.totalCount}
                    </p>
                    <p className="text-xs text-slate-400">{h.score} điểm</p>
                  </div>
                  <Link href={`/quiz/${h.setId}`}>
                    <Button variant="secondary">Chơi lại</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="pt-4">
        <h2 className="text-xl font-bold text-white">Câu tự luận đã làm</h2>
      </div>

      {essaysError && <p className="text-sm text-red-400">{essaysError}</p>}

      {essaysLoading ? (
        <p className="text-slate-400">Đang tải…</p>
      ) : essays.length === 0 ? (
        <Card>
          <p className="text-slate-300">Chưa làm câu tự luận nào.</p>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {essays.map((e) => (
            <motion.div key={e.attemptId} variants={fadeSlideUp}>
              <Card className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm text-white">
                    <MathText text={e.question} />
                  </p>
                  {e.needsTeacherReview ? (
                    <Badge tone="yellow" className="shrink-0">
                      Đang chờ duyệt
                    </Badge>
                  ) : (
                    <Badge tone={e.correct ? 'green' : 'red'} className="shrink-0">
                      {e.correct ? 'Đúng' : 'Sai'}
                    </Badge>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Câu trả lời của bạn
                  </p>
                  <p className="text-sm text-slate-200">
                    <MathText text={e.myAnswer} />
                  </p>
                </div>
                {!e.needsTeacherReview && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Đáp án mẫu
                    </p>
                    <p className="text-sm text-slate-200">
                      <MathText text={e.correctAnswer} />
                    </p>
                  </div>
                )}
                {e.teacherComment && (
                  <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Nhận xét của giáo viên
                    </p>
                    <p className="text-sm text-slate-200">
                      <MathText text={e.teacherComment} />
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {e.topic} ·{' '}
                  {new Date(e.createdAt).toLocaleString('vi-VN', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
