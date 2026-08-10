'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import type { PendingAttemptReviewItem } from '@/lib/types';

export default function TeacherAttemptReviewPage() {
  const [items, setItems] = useState<PendingAttemptReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PendingAttemptReviewItem[]>('/api/v1/attempts/pending-review')
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách chờ duyệt.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleReview(attemptId: string, correct: boolean) {
    setActionError('');
    setSubmittingId(attemptId);
    try {
      await apiPost(`/api/v1/attempts/${attemptId}/review`, { correct });
      setItems((prev) => prev.filter((i) => i.attemptId !== attemptId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể duyệt câu trả lời này.');
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Duyệt câu trả lời tự luận</h1>
        <p className="text-sm text-slate-400">
          Câu tự luận trong các đề của bạn — đọc đáp án mẫu và câu trả lời của học sinh rồi tự
          đánh giá, hệ thống không tự động chấm câu tự luận.
        </p>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {actionError && (
        <Card>
          <p className="text-sm text-red-400">{actionError}</p>
        </Card>
      )}

      {items.length === 0 && !error ? (
        <Card>
          <p className="text-sm text-slate-400">Không còn câu nào chờ duyệt.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isSubmitting = submittingId === item.attemptId;
            return (
              <Card key={item.attemptId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {item.studentUsername}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <p className="text-sm text-white">
                  <MathText text={item.question} />
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Đáp án mẫu
                    </p>
                    <p className="text-sm text-slate-200">
                      <MathText text={item.correctAnswer} />
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Câu trả lời học sinh
                    </p>
                    <p className="text-sm text-slate-200">
                      <MathText text={item.studentAnswer} />
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleReview(item.attemptId, true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang lưu…' : 'Đúng'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReview(item.attemptId, false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang lưu…' : 'Sai'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
