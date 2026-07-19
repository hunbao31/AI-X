'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface TeacherStats {
  totalExercises: number;
  totalAttempts: number;
}

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TeacherStats>('/api/v1/exercises/stats')
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load stats.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading stats…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="text-center transition-transform hover:scale-105">
            <p className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-4xl font-bold text-transparent">
              {stats?.totalExercises ?? 0}
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
              Exercises created
            </p>
          </Card>
          <Card className="text-center transition-transform hover:scale-105">
            <p className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-4xl font-bold text-transparent">
              {stats?.totalAttempts ?? 0}
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
              Student attempts received
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
