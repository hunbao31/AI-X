'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PendingReviewItem } from '@/lib/types';

export default function TeacherReviewPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PendingReviewItem[]>(`/api/v1/diagnostic/classes/${classId}/pending-review`)
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách chờ duyệt.'),
      )
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(load, [load]);

  async function handleReview(attemptId: string, correct: boolean) {
    setActionError('');
    setSubmittingId(attemptId);
    try {
      await apiPost(`/api/v1/diagnostic/attempts/${attemptId}/review`, { correct });
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
      <Link
        href={`/teacher/classes/${classId}`}
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Quay lại lớp học
      </Link>

      <Card className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Duyệt câu trả lời tự luận</h1>
        <p className="text-sm text-slate-400">
          Đọc kỹ đáp án mẫu và câu trả lời của học sinh rồi tự đánh giá — hệ thống không tự
          động chấm câu tự luận.
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
            const isExpanded = expandedId === item.attemptId;
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

                <p className="text-sm text-white">{item.question}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Đáp án mẫu
                    </p>
                    <p className="text-sm text-slate-200">{item.dapAnMau}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Câu trả lời học sinh
                    </p>
                    <p className="text-sm text-slate-200">{item.cauTraLoi}</p>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.attemptId)}
                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    {isExpanded ? 'Ẩn chi tiết kỹ thuật' : '+ Chi tiết kỹ thuật'}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm text-slate-300">
                        similarity_score:{' '}
                        <span className="font-mono">
                          {item.similarityScore === null ? 'N/A' : item.similarityScore.toFixed(4)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Chỉ số tham khảo, KHÔNG phản ánh đúng/sai — đã ghi nhận trường hợp câu
                        trả lời sai vẫn có điểm cao. Vui lòng đọc kỹ câu trả lời.
                      </p>
                    </div>
                  )}
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
