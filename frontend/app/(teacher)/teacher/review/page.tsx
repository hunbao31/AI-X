'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import type { PendingAttemptReviewGroup } from '@/lib/types';

export default function TeacherAttemptReviewPage() {
  const [groups, setGroups] = useState<PendingAttemptReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PendingAttemptReviewGroup[]>('/api/v1/attempts/pending-review')
      .then(setGroups)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách chờ duyệt.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleReview(exerciseId: string, correct: boolean) {
    setActionError('');
    setSubmittingId(exerciseId);
    try {
      await apiPost('/api/v1/attempts/review-group', {
        exerciseId,
        correct,
        comment: comments[exerciseId]?.trim() || undefined,
      });
      setGroups((prev) => prev.filter((g) => g.exerciseId !== exerciseId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể duyệt câu này.');
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
          Mỗi câu hỏi tự luận được gom thành 1 nhóm — đọc qua các câu trả lời rồi
          duyệt đúng/sai và nhận xét một lần cho cả nhóm, áp dụng chung cho mọi
          học sinh đang chờ duyệt câu đó.
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

      {groups.length === 0 && !error ? (
        <Card>
          <p className="text-sm text-slate-400">Không còn câu nào chờ duyệt.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isSubmitting = submittingId === group.exerciseId;
            return (
              <Card key={group.exerciseId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white">
                    <MathText text={group.question} />
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">
                    {group.submissions.length} học sinh
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Đáp án mẫu
                  </p>
                  <p className="text-sm text-slate-200">
                    <MathText text={group.correctAnswer} />
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Câu trả lời học sinh
                  </p>
                  {group.submissions.map((s) => (
                    <div
                      key={s.attemptId}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-slate-400">{s.studentUsername}</p>
                      <p className="text-sm text-slate-200">
                        <MathText text={s.studentAnswer} />
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Nhận xét chung <span className="normal-case text-slate-500">(không bắt buộc)</span>
                  </label>
                  <textarea
                    value={comments[group.exerciseId] ?? ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [group.exerciseId]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Nhận xét áp dụng cho cả nhóm…"
                    className="input-base"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleReview(group.exerciseId, true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang lưu…' : `Đúng cho cả ${group.submissions.length} bài`}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReview(group.exerciseId, false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang lưu…' : `Sai cho cả ${group.submissions.length} bài`}
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
