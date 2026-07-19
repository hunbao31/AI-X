'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';

interface Exercise {
  id: string;
  question: string;
  type: 'mcq' | 'text';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export default function TeacherManagePage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manage Exercises</h1>
        <Link href="/teacher/create">
          <Button>+ New Exercise</Button>
        </Link>
      </div>

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
                <p className="truncate font-medium text-white">{ex.question}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="indigo">{ex.type.toUpperCase()}</Badge>
                  <DifficultyBadge difficulty={ex.difficulty} />
                  <span className="text-xs capitalize text-slate-400">{ex.topic}</span>
                </div>
              </div>
              <Button variant="danger" onClick={() => handleDelete(ex.id)}>
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
