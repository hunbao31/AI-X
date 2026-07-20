'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiDelete } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { ImportQuestions } from '@/components/exercise/ImportQuestions';
import { MathText } from '@/components/ui/MathText';

interface Exercise {
  id: string;
  question: string;
  type: 'mcq' | 'text';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

function TeacherManageInner() {
  // Import is the primary creation path — ?import=1 (e.g. from the dashboard
  // quick link) opens the panel immediately.
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(searchParams.get('import') === '1');

  function load() {
    setLoading(true);
    apiGet<Exercise[]>('/api/v1/exercises')
      .then(setExercises)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load exercises.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/v1/exercises/${id}`);
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exercise.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Manage Exercises</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport((v) => !v)}>
            {showImport ? 'Hide import' : '📥 Import Questions'}
          </Button>
          <Link href="/teacher/create">
            <Button variant="secondary">+ New Exercise</Button>
          </Link>
        </div>
      </div>

      {showImport && (
        <Card className="space-y-4 border-indigo-400/30">
          <div>
            <h2 className="text-lg font-semibold text-white">Import from CSV</h2>
            <p className="mt-1 text-sm text-slate-400">
              The fastest way to build your question bank — one row per
              question, LaTeX supported.
            </p>
          </div>
          <ImportQuestions onImported={load} />
        </Card>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : exercises.length === 0 ? (
        <Card>
          <p className="text-slate-300">No exercises yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <Card
              key={ex.id}
              className="flex items-center justify-between gap-4 py-4 transition-transform hover:scale-[1.01]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  <MathText text={ex.question} />
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="indigo">{ex.type.toUpperCase()}</Badge>
                  <DifficultyBadge difficulty={ex.difficulty} />
                  <span className="text-xs capitalize text-slate-400">{ex.topic}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/teacher/exercises/${ex.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
                <Button variant="danger" onClick={() => handleDelete(ex.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeacherManagePage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <TeacherManageInner />
    </Suspense>
  );
}
