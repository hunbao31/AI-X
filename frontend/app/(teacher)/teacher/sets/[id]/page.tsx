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
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { MathText } from '@/components/ui/MathText';
import type { SetDetail, Exercise, LeaderboardEntry } from '@/lib/types';

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

  const load = useCallback(() => {
    Promise.all([
      apiGet<SetDetail>(`/api/v1/sets/${setId}`),
      apiGet<Exercise[]>('/api/v1/exercises'),
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
        setError(err instanceof Error ? err.message : 'Failed to load quiz set.'),
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
      setActionError(err instanceof Error ? err.message : 'Failed to add exercise.');
    }
  }

  async function removeExercise(exerciseId: string) {
    setActionError('');
    try {
      await apiDelete(`/api/v1/sets/${setId}/exercises/${exerciseId}`);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove exercise.');
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
      setActionError(err instanceof Error ? err.message : 'Failed to update set.');
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
      setActionError(err instanceof Error ? err.message : 'Failed to update set.');
    }
  }

  async function togglePublished() {
    if (!detail) return;
    setActionError('');
    try {
      await apiPatch(`/api/v1/sets/${setId}`, { isPublished: !detail.isPublished });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update set.');
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
      setActionError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    setActionError('');
    try {
      const copy = await apiPost<{ id: string }>(`/api/v1/sets/${setId}/duplicate`, {});
      router.push(`/teacher/sets/${copy.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to duplicate.');
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
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status}).`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.title ?? 'quiz'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to export.');
    }
  }

  if (loading) return <p className="text-slate-400">Loading quiz set…</p>;

  if (error || !detail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{error || 'Quiz set not found.'}</p>
        <Link
          href="/teacher/sets"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Back to quiz sets
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
        ← All quiz sets
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
            {!detail.isPublished && <Badge tone="yellow">draft</Badge>}
            <Badge tone={detail.mode === 'exam' ? 'red' : 'green'}>{detail.mode}</Badge>
            {detail.isPublic ? (
              <Badge tone="green">public</Badge>
            ) : detail.class ? (
              <Badge tone="indigo">{detail.class.name}</Badge>
            ) : detail.hasAccessCode ? (
              <Badge tone="yellow">code</Badge>
            ) : (
              <Badge>private</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>📋 {detail.questionCount} questions</span>
          <span>
            {detail.timeLimitPerQuestion
              ? `⏱️ ${detail.timeLimitPerQuestion}s per question`
              : '⏱️ untimed'}
          </span>
          <Button variant="secondary" onClick={togglePublic} disabled={savingPublic}>
            {savingPublic
              ? 'Saving…'
              : detail.isPublic
                ? 'Make private'
                : 'Make public'}
          </Button>
          <Button variant="secondary" onClick={toggleMode}>
            {detail.mode === 'practice' ? 'Switch to exam' : 'Switch to practice'}
          </Button>
          <Button variant="secondary" onClick={togglePublished}>
            {detail.isPublished ? 'Unpublish (draft)' : 'Publish'}
          </Button>
          <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? 'Duplicating…' : '⧉ Duplicate'}
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            ⬇ Export CSV
          </Button>
          <Link href={`/quiz/${detail.id}`}>
            <Button variant="ghost">Preview as student →</Button>
          </Link>
        </div>
        {actionError && <p className="text-sm text-red-400">{actionError}</p>}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Quiz settings</h2>
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              🔀 Shuffle question order
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={shuffleAnswers}
                onChange={(e) => setShuffleAnswers(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              🔀 Shuffle answer order
            </label>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Full quiz time limit (seconds)
              </label>
              <input
                type="number"
                min={30}
                max={7200}
                value={totalTime}
                onChange={(e) => setTotalTime(e.target.value)}
                placeholder="No total limit"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Access code{' '}
                <span className="text-slate-500">(private exam via code)</span>
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Empty = no code"
                minLength={4}
                maxLength={32}
                className="input-base"
              />
            </div>
          </div>
          <Button type="submit" disabled={savingSettings}>
            {savingSettings ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Questions in this set</h2>
        {!detail.items || detail.items.length === 0 ? (
          <p className="text-sm text-slate-400">
            No questions yet — add some from your exercise bank below.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.items.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {i + 1}. <MathText text={item.exercise.question} />
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="indigo">{item.exercise.type.toUpperCase()}</Badge>
                    <DifficultyBadge difficulty={item.exercise.difficulty} />
                    <span className="text-xs text-slate-400">{item.exercise.topic}</span>
                  </div>
                </div>
                <Button variant="danger" onClick={() => removeExercise(item.exerciseId)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Add from your exercise bank</h2>
        {addable.length === 0 ? (
          <p className="text-sm text-slate-400">
            Every existing exercise is already in this set —{' '}
            <Link
              href="/teacher/create"
              className="text-indigo-300 hover:text-indigo-200"
            >
              create a new one
            </Link>
            .
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
                    <Badge tone="indigo">{ex.type.toUpperCase()}</Badge>
                    <DifficultyBadge difficulty={ex.difficulty} />
                    <span className="text-xs text-slate-400">{ex.topic}</span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => addExercise(ex.id)}>
                  + Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {leaderboard.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-white">🏆 Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
              >
                <span className="text-sm text-slate-200">
                  <span className="mr-3 font-bold text-white">#{entry.rank}</span>
                  {entry.username}
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
