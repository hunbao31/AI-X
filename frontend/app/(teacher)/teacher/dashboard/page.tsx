'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MathText } from '@/components/ui/MathText';
import type { ClassSummary } from '@/lib/types';

interface TeacherStats {
  totalExercises: number;
  totalAttempts: number;
}

interface QuestionAnalytics {
  exerciseId: string;
  question: string;
  topic: string;
  attempts: number;
  correct: number;
  correctRate: number;
}

interface SetAnalytics {
  setId: string;
  title: string;
  attempts: number;
  avgScore: number;
  avgDurationSeconds: number | null;
}

const QUICK_LINKS = [
  {
    href: '/teacher/classes',
    title: 'Classes',
    description: 'Create classes and share join codes',
    icon: '🏫',
  },
  {
    href: '/teacher/manage?import=1',
    title: 'Import Questions',
    description: 'Bulk-add from CSV — the fast way',
    icon: '📥',
  },
  {
    href: '/teacher/sets',
    title: 'Quiz Sets',
    description: 'Build Kahoot-style quizzes',
    icon: '🎯',
  },
];

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [questions, setQuestions] = useState<QuestionAnalytics[]>([]);
  const [setStatsList, setSetStatsList] = useState<SetAnalytics[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<TeacherStats>('/api/v1/exercises/stats'),
      apiGet<ClassSummary[]>('/api/v1/classes'),
      apiGet<QuestionAnalytics[]>('/api/v1/analytics/questions'),
      apiGet<SetAnalytics[]>('/api/v1/analytics/sets'),
    ])
      .then(([teacherStats, classList, questionStats, quizStats]) => {
        setStats(teacherStats);
        setClasses(classList);
        setQuestions(questionStats);
        setSetStatsList(quizStats);
      })
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
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Card className="text-center transition-transform hover:scale-105">
              <p className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-4xl font-bold text-transparent">
                {classes.length}
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
                Classes
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="block">
                <Card className="h-full transition-transform hover:scale-105">
                  <p className="text-2xl">{link.icon}</p>
                  <p className="mt-2 font-semibold text-white">{link.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{link.description}</p>
                </Card>
              </Link>
            ))}
          </div>

          {questions.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Most missed questions
              </h2>
              {questions.slice(0, 5).map((q) => (
                <div
                  key={q.exerciseId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      <MathText text={q.question} />
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {q.topic} · {q.attempts} attempts
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      q.correctRate < 50 ? 'text-red-300' : 'text-yellow-300'
                    }`}
                  >
                    {q.correctRate}% correct
                  </span>
                </div>
              ))}
            </Card>
          )}

          {setStatsList.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Quiz performance</h2>
              {setStatsList.slice(0, 6).map((s) => (
                <Link
                  key={s.setId}
                  href={`/teacher/sets/${s.setId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.attempts} attempt{s.attempts === 1 ? '' : 's'}
                      {s.avgDurationSeconds !== null &&
                        ` · avg time ${Math.round(s.avgDurationSeconds)}s`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white">
                    avg {s.avgScore}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
