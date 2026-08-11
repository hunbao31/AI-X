'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MathText } from '@/components/ui/MathText';
import type { PendingAttemptReviewGroup, ReviewedGroup } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TeacherAttemptReviewPage() {
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Duyệt câu trả lời tự luận</h1>
        <p className="text-sm text-slate-400">
          Mỗi câu hỏi tự luận được gom thành 1 nhóm — đọc qua các câu trả lời rồi
          duyệt đúng/sai và nhận xét một lần cho cả nhóm, áp dụng chung cho mọi
          học sinh trong nhóm đó.
        </p>
      </Card>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            tab === 'pending'
              ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          Đang chờ duyệt
        </button>
        <button
          type="button"
          onClick={() => setTab('reviewed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            tab === 'reviewed'
              ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          Lịch sử đã duyệt
        </button>
      </div>

      {tab === 'pending' ? <PendingTab /> : <ReviewedTab />}
    </div>
  );
}

function PendingTab() {
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
    <div className="space-y-4">
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
        groups.map((group) => {
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
                <Button onClick={() => handleReview(group.exerciseId, true)} disabled={isSubmitting}>
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
        })
      )}
    </div>
  );
}

function ReviewedTab() {
  const [groups, setGroups] = useState<ReviewedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editCorrect, setEditCorrect] = useState(true);
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<ReviewedGroup[]>('/api/v1/attempts/reviewed')
      .then(setGroups)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải lịch sử.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function keyOf(group: ReviewedGroup) {
    return `${group.exerciseId}::${group.reviewedAt}`;
  }

  function startEdit(group: ReviewedGroup) {
    setEditingKey(keyOf(group));
    setEditCorrect(group.correct);
    setEditComment(group.comment ?? '');
    setActionError('');
  }

  async function saveEdit(group: ReviewedGroup) {
    setSaving(true);
    setActionError('');
    try {
      await apiPost('/api/v1/attempts/review-group/edit', {
        attemptIds: group.submissions.map((s) => s.attemptId),
        correct: editCorrect,
        comment: editComment.trim() || undefined,
      });
      setEditingKey(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể sửa lượt duyệt này.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải…</p>;

  return (
    <div className="space-y-4">
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
          <p className="text-sm text-slate-400">Chưa duyệt câu nào.</p>
        </Card>
      ) : (
        groups.map((group) => {
          const key = keyOf(group);
          const isEditing = editingKey === key;
          return (
            <Card key={key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm text-white">
                  <MathText text={group.question} />
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={group.correct ? 'green' : 'red'}>
                    {group.correct ? 'Đúng' : 'Sai'}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatDate(group.reviewedAt)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                {group.submissions.length} học sinh:{' '}
                {group.submissions.map((s) => s.studentUsername).join(', ')}
              </p>

              {group.comment && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Nhận xét
                  </p>
                  <p className="text-sm text-slate-200">
                    <MathText text={group.comment} />
                  </p>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-3 rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCorrect(true)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                        editCorrect
                          ? 'border border-green-500/50 bg-green-500/20 text-green-300'
                          : 'border border-white/15 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Đúng
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCorrect(false)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                        !editCorrect
                          ? 'border border-red-500/50 bg-red-500/20 text-red-300'
                          : 'border border-white/15 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Sai
                    </button>
                  </div>
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={2}
                    placeholder="Nhận xét (không bắt buộc)…"
                    className="input-base"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(group)} disabled={saving}>
                      {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingKey(null)} disabled={saving}>
                      Hủy
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sửa lại chỉ đổi kết quả hiển thị cho học sinh — điểm thành thạo và XP đã
                    cộng từ lần duyệt trước sẽ không tự điều chỉnh lại.
                  </p>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => startEdit(group)}>
                  Sửa
                </Button>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
