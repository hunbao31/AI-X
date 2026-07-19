'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface AnalyticsSummary {
  totalAttempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageMastery: number;
}

interface GamificationSummary {
  xp: number;
  level: number;
  streak: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<AnalyticsSummary>('/api/v1/analytics'),
      apiGet<GamificationSummary>('/api/v1/gamification'),
    ])
      .then(([analytics, gamificationSummary]) => {
        setSummary(analytics);
        setGamification(gamificationSummary);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading dashboard…</p>;

  if (error || !summary || !gamification) {
    return <p className="text-red-400">{error || 'No analytics available.'}</p>;
  }

  const xpIntoLevel = gamification.xp % 100;

  const stats = [
    { label: 'Total attempts', value: summary.totalAttempts },
    { label: 'Accuracy', value: `${summary.accuracy}%` },
    { label: 'Correct', value: summary.correct },
    { label: 'Incorrect', value: summary.incorrect },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Your Progress</h1>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-lg font-bold text-transparent">
            Level {gamification.level}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200">
            🔥 {gamification.streak}-day streak
          </span>
        </div>
        <div className="mb-1 flex justify-between text-sm text-slate-400">
          <span>XP</span>
          <span>{xpIntoLevel}/100 to next level</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
            style={{ width: `${xpIntoLevel}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-slate-500">{gamification.xp} XP total</p>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center transition-transform hover:scale-105">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-1 flex justify-between text-sm font-medium text-slate-300">
          <span>Average mastery</span>
          <span>{summary.averageMastery}/100</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all"
            style={{ width: `${summary.averageMastery}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
