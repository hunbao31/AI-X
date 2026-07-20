'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ClassDetail } from '@/lib/types';

export default function TeacherClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [topicName, setTopicName] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicError, setTopicError] = useState('');

  const load = useCallback(() => {
    apiGet<ClassDetail>(`/api/v1/classes/${classId}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load class.'),
      )
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(load, [load]);

  async function handleAddTopic(e: FormEvent) {
    e.preventDefault();
    setTopicError('');
    setAddingTopic(true);
    try {
      await apiPost('/api/v1/topics', { name: topicName, classId });
      setTopicName('');
      load();
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : 'Failed to add topic.');
    } finally {
      setAddingTopic(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading class…</p>;

  if (error || !detail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{error || 'Class not found.'}</p>
        <Link
          href="/teacher/classes"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Back to classes
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/teacher/classes"
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← All classes
      </Link>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
          <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 font-mono text-lg font-bold tracking-widest text-indigo-300">
            {detail.code}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Share this code with students so they can join. {detail.members.length}{' '}
          member{detail.members.length === 1 ? '' : 's'}.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Topics</h2>
        <form onSubmit={handleAddTopic} className="flex gap-2">
          <input
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g. Quadratic equations"
            required
            className="input-base flex-1"
          />
          <Button type="submit" disabled={addingTopic}>
            {addingTopic ? 'Adding…' : 'Add topic'}
          </Button>
        </form>
        {topicError && <p className="text-sm text-red-400">{topicError}</p>}

        {detail.topics.length === 0 ? (
          <p className="text-sm text-slate-400">
            No topics yet — add one, then attach exercises to it from Create
            Exercise.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detail.topics.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200"
              >
                {t.name}
                <span className="ml-2 text-xs text-slate-500">
                  {t._count.exercises} exercises
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Quizzes</h2>
          <Link href="/teacher/sets">
            <Button variant="secondary">Manage quiz sets</Button>
          </Link>
        </div>
        {detail.sets.length === 0 ? (
          <p className="text-sm text-slate-400">
            No quizzes attached to this class yet.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.sets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {s._count.items} questions
                    {s.timeLimitPerQuestion
                      ? ` · ${s.timeLimitPerQuestion}s per question`
                      : ' · untimed'}
                  </p>
                </div>
                <Link href={`/teacher/sets/${s.id}`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Members</h2>
        <div className="space-y-2">
          {detail.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
            >
              <span className="text-sm text-slate-200">{m.user.username}</span>
              <Badge tone={m.role === 'teacher' ? 'indigo' : 'slate'}>{m.role}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
