'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  apiGet,
  apiPost,
  apiDelete,
  apiPatch,
  API_BASE_URL,
  getAuthToken,
} from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { MathText } from '@/components/ui/MathText';
import { QuizBuilder } from '@/components/quiz-builder/QuizBuilder';
import type { SetDetail, SetItem, Exercise, LeaderboardEntry } from '@/lib/types';

// Display-only labels for raw enum values rendered directly in JSX —
// comparisons elsewhere stay on the original English values (e.g.
// detail.mode === 'exam').
const MODE_LABELS: Record<string, string> = {
  practice: 'Luyện tập',
  exam: 'Kiểm tra',
};

const TYPE_LABELS: Record<string, string> = {
  mcq: 'Trắc nghiệm',
  text: 'Tự luận',
};

export default function TeacherSetDetailPage() {
  const params = useParams<{ id: string }>();
  const setId = params.id;
  const router = useRouter();

  const [detail, setDetail] = useState<SetDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingPublic, setSavingPublic] = useState(false);

  // Advanced settings form (populated from detail on load).
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [totalTime, setTotalTime] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      apiGet<SetDetail>(`/api/v1/sets/${setId}`),
      // Personal bank — only questions this teacher authored, not the old
      // messy "everyone's exercises" pool.
      apiGet<Exercise[]>('/api/v1/exercises/mine'),
      apiGet<LeaderboardEntry[]>(`/api/v1/sets/${setId}/leaderboard`),
    ])
      .then(([loadedDetail, exerciseList, entries]) => {
        setDetail(loadedDetail);
        setExercises(exerciseList);
        setLeaderboard(entries);
        setShuffleQuestions(loadedDetail.shuffleQuestions);
        setShuffleAnswers(loadedDetail.shuffleAnswers);
        setTotalTime(loadedDetail.totalTimeLimit?.toString() ?? '');
        setAccessCode(loadedDetail.accessCode ?? '');
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải bộ đề.'),
      )
      .finally(() => setLoading(false));
  }, [setId]);

  useEffect(load, [load]);

  async function addExercise(exerciseId: string) {
    setActionError('');
    try {
      await apiPost(`/api/v1/sets/${setId}/add-exercise`, { exerciseId });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể thêm bài tập.');
    }
  }

  async function togglePublic() {
    if (!detail) return;
    setSavingPublic(true);
    setActionError('');
    try {
      await apiPatch(`/api/v1/sets/${setId}`, { isPublic: !detail.isPublic });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể cập nhật bộ đề.');
    } finally {
      setSavingPublic(false);
    }
  }

  async function toggleMode() {
    if (!detail) return;
    setActionError('');
    try {
      await apiPatch(`/api/v1/sets/${setId}`, {
        mode: detail.mode === 'practice' ? 'exam' : 'practice',
      });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể cập nhật bộ đề.');
    }
  }

  async function togglePublished() {
    if (!detail) return;
    setActionError('');
    try {
      await apiPatch(`/api/v1/sets/${setId}`, { isPublished: !detail.isPublished });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể cập nhật bộ đề.');
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError('');
    try {
      await apiPatch(`/api/v1/sets/${setId}`, {
        shuffleQuestions,
        shuffleAnswers,
        totalTimeLimit: totalTime === '' ? null : Number(totalTime),
        accessCode: accessCode.trim() === '' ? null : accessCode.trim(),
      });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể lưu cài đặt.');
    } finally {
      setSavingSettings(false);
    }
  }

  // QuizBuilder owns question CRUD itself; this just keeps the page's
  // `detail` state (questionCount + items) in sync after each change.
  function updateItems(next: SetItem[]) {
    setDetail((prev) => (prev ? { ...prev, items: next, questionCount: next.length } : prev));
  }

  async function handleDeleteSet() {
    setDeletingSet(true);
    setActionError('');
    try {
      await apiDelete(`/api/v1/sets/${setId}`);
      router.push('/teacher/sets');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể xóa bộ đề.');
      setDeletingSet(false);
      setConfirmingDelete(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    setActionError('');
    try {
      const copy = await apiPost<{ id: string }>(`/api/v1/sets/${setId}/duplicate`, {});
      router.push(`/teacher/sets/${copy.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể nhân bản.');
      setDuplicating(false);
    }
  }

  // Raw CSV download with the auth header (outside the JSON api client).
  async function handleExport() {
    setActionError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/sets/${setId}/export`, {
        headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` },
      });
      if (!res.ok) throw new Error(`Xuất thất bại (HTTP ${res.status}).`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.title ?? 'quiz'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể xuất.');
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải bộ đề…</p>;

  if (error || !detail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{error || 'Không tìm thấy bộ đề.'}</p>
        <Link
          href="/teacher/sets"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại danh sách bộ đề
        </Link>
      </Card>
    );
  }

  const itemExerciseIds = new Set(detail.items?.map((i) => i.exerciseId) ?? []);
  const addable = exercises.filter((e) => !itemExerciseIds.has(e.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/teacher/sets"
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Tất cả bộ đề
      </Link>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{detail.title}</h1>
            {detail.description && (
              <p className="mt-1 text-sm text-slate-400">{detail.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!detail.isPublished && <Badge tone="yellow">bản nháp</Badge>}
            <Badge tone={detail.mode === 'exam' ? 'red' : 'green'}>
              {MODE_LABELS[detail.mode] ?? detail.mode}
            </Badge>
            {detail.isPublic ? (
              <Badge tone="green">công khai</Badge>
            ) : detail.class ? (
              <Badge tone="indigo">{detail.class.name}</Badge>
            ) : detail.hasAccessCode ? (
              <Badge tone="yellow">có mã</Badge>
            ) : (
              <Badge>riêng tư</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>📋 {detail.questionCount} câu hỏi</span>
          <span>
            {detail.timeLimitPerQuestion
              ? `⏱️ ${detail.timeLimitPerQuestion} giây mỗi câu`
              : '⏱️ không giới hạn thời gian'}
          </span>
          <Button variant="secondary" onClick={togglePublic} disabled={savingPublic}>
            {savingPublic
              ? 'Đang lưu…'
              : detail.isPublic
                ? 'Chuyển sang riêng tư'
                : 'Chuyển sang công khai'}
          </Button>
          <Button variant="secondary" onClick={toggleMode}>
            {detail.mode === 'practice' ? 'Chuyển sang chế độ kiểm tra' : 'Chuyển sang chế độ luyện tập'}
          </Button>
          <Button variant="secondary" onClick={togglePublished}>
            {detail.isPublished ? 'Hủy xuất bản (bản nháp)' : 'Xuất bản'}
          </Button>
          <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? 'Đang nhân bản…' : '⧉ Nhân bản'}
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            ⬇ Xuất CSV
          </Button>
          <Link href={`/quiz/${detail.id}`}>
            <Button variant="ghost">Xem trước như học sinh →</Button>
          </Link>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            🗑 Xóa bộ đề
          </Button>
        </div>
        {actionError && <p className="text-sm text-red-400">{actionError}</p>}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title="Xóa bộ đề này?"
        message={`"${detail.title}" sẽ bị xóa vĩnh viễn. Các câu hỏi của bạn vẫn được giữ trong ngân hàng câu hỏi cá nhân — chỉ bộ đề này bị xóa. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa bộ đề"
        danger
        busy={deletingSet}
        onConfirm={handleDeleteSet}
        onCancel={() => setConfirmingDelete(false)}
      />

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Cài đặt bộ đề</h2>
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              🔀 Xáo trộn thứ tự câu hỏi
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={shuffleAnswers}
                onChange={(e) => setShuffleAnswers(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              🔀 Xáo trộn thứ tự đáp án
            </label>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Giới hạn thời gian toàn bộ bài (giây)
              </label>
              <input
                type="number"
                min={30}
                max={7200}
                value={totalTime}
                onChange={(e) => setTotalTime(e.target.value)}
                placeholder="Không giới hạn tổng thời gian"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Mã truy cập{' '}
                <span className="text-slate-500">(bài kiểm tra riêng tư qua mã)</span>
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Để trống = không có mã"
                minLength={4}
                maxLength={32}
                className="input-base"
              />
            </div>
          </div>
          <Button type="submit" disabled={savingSettings}>
            {savingSettings ? 'Đang lưu…' : 'Lưu cài đặt'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Câu hỏi</h2>
          <span className="text-xs text-slate-500">
            {detail.questionCount} câu hỏi
          </span>
        </div>
        <QuizBuilder setId={setId} items={detail.items ?? []} onItemsChange={updateItems} />
      </Card>

      <Card className="space-y-3">
        <button
          type="button"
          onClick={() => setShowBankPicker((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {showBankPicker ? '▾' : '▸'} Dùng lại từ ngân hàng câu hỏi của tôi
          </h2>
          <span className="text-xs text-slate-500">không bắt buộc</span>
        </button>
        {showBankPicker &&
          (addable.length === 0 ? (
            <p className="text-sm text-slate-400">
              Không còn gì khác trong ngân hàng cá nhân để thêm — mọi thứ đã
              có ở đây, hoặc bạn chưa soạn câu hỏi nào khác.
            </p>
          ) : (
          <div className="space-y-2">
            {addable.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    <MathText text={ex.question} />
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="indigo">{TYPE_LABELS[ex.type] ?? ex.type.toUpperCase()}</Badge>
                    <DifficultyBadge difficulty={ex.difficulty} />
                    <span className="text-xs text-slate-400">{ex.topic}</span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => addExercise(ex.id)}>
                  + Thêm
                </Button>
              </div>
            ))}
          </div>
          ))}
      </Card>

      {leaderboard.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-white">🏆 Bảng xếp hạng</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-200">
                  <span className="w-7 shrink-0 font-bold text-white">
                    #{entry.rank}
                  </span>
                  <Avatar id={entry.avatar} size={26} />
                  <span className="truncate">{entry.username}</span>
                </span>
                <span className="text-sm font-semibold text-white">
                  {entry.score}{' '}
                  <span className="font-normal text-slate-400">
                    ({entry.correctCount}/{entry.totalCount})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
