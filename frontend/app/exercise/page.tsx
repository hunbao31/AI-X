'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

interface Exercise {
  id: string;
  question: string;
  correctAnswer: string;
}

interface AttemptResult {
  correct: boolean;
  understandingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  suggestion: string;
  mastery: {
    score: number;
    attempts: number;
  };
  recommendation: {
    message: string;
    nextAction: string;
  };
  gamification: {
    xp: number;
    level: number;
    streak: number;
  };
}

function ExercisePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Falls back to "algebra" so old links/bookmarks from before Step 10 still work.
  const topic = searchParams.get('topic') ?? 'algebra';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setAnswer('');

    apiGet<Exercise[]>(`/api/v1/exercises?topic=${encodeURIComponent(topic)}`)
      .then((exercises) => setExercise(exercises[0] ?? null))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load exercise.'),
      )
      .finally(() => setLoading(false));
  }, [router, topic]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!exercise) return;

    setError('');
    setSubmitting(true);

    try {
      const attemptResult = await apiPost<AttemptResult>('/api/v1/attempts', {
        exerciseId: exercise.id,
        topic,
        answer,
      });
      setResult(attemptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="exercise-card">
        <p>Loading exercise…</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="exercise-card">
        {error ? <p className="error-text">{error}</p> : <p>No exercise available.</p>}
        <p className="dashboard-link">
          <a href="/curriculum">← Browse curriculum</a>
        </p>
      </main>
    );
  }

  return (
    <main className="exercise-card">
      <a className="dashboard-back" href="/curriculum">
        ← Browse curriculum
      </a>

      <span className="topic-label">{topic}</span>
      <h1>Exercise</h1>
      <p className="question-text">{exercise.question}</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="answer">Your answer</label>
          <input
            id="answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            disabled={!!result}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting || !!result}>
          {submitting ? 'Checking…' : 'Submit'}
        </button>
      </form>

      {result && (
        <div className={`result-box ${result.correct ? 'result-correct' : 'result-incorrect'}`}>
          <p className="result-status">{result.correct ? 'Correct' : 'Incorrect'}</p>
          <p className="result-level">
            Understanding:{' '}
            <span className={`level-badge level-${result.understandingLevel.toLowerCase()}`}>
              {result.understandingLevel}
            </span>
          </p>
          <p className="result-explanation">{result.explanation}</p>
          <p className="result-suggestion">Suggestion: {result.suggestion}</p>

          <div className="mastery-box">
            <div className="mastery-header">
              <span>{topic} mastery</span>
              <span>{result.mastery.score}/100</span>
            </div>
            <div className="mastery-bar">
              <div
                className="mastery-bar-fill"
                style={{ width: `${result.mastery.score}%` }}
              />
            </div>
            <p className="mastery-attempts">
              {result.mastery.attempts} attempt
              {result.mastery.attempts === 1 ? '' : 's'}
            </p>
          </div>

          <div className="gamification-box">
            <span className="xp-gain">+{result.correct ? 10 : 3} XP</span>
            <div className="gamification-stats">
              <span className="level-pill">Level {result.gamification.level}</span>
              <span className="streak-pill">🔥 {result.gamification.streak}-day streak</span>
            </div>
          </div>

          <div className="recommendation-box">
            <p className="recommendation-message">{result.recommendation.message}</p>
            <p className="recommendation-action">Next: {result.recommendation.nextAction}</p>
          </div>

          <p className="dashboard-link">
            <a href="/dashboard">View my dashboard →</a>
          </p>
        </div>
      )}
    </main>
  );
}

export default function ExercisePage() {
  return (
    <Suspense
      fallback={
        <main className="exercise-card">
          <p>Loading…</p>
        </main>
      }
    >
      <ExercisePageInner />
    </Suspense>
  );
}
