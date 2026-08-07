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

const UNDERSTANDING_LABEL: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: 'Yếu',
  MEDIUM: 'Khá',
  HIGH: 'Tốt',
};

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
        setError(err instanceof Error ? err.message : 'Không thể tải bài tập.'),
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
      setError(err instanceof Error ? err.message : 'Không thể nộp câu trả lời.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="exercise-card">
        <p>Đang tải bài tập…</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="exercise-card">
        {error ? <p className="error-text">{error}</p> : <p>Chưa có bài tập nào.</p>}
        <p className="dashboard-link">
          <a href="/curriculum">← Xem chương trình học</a>
        </p>
      </main>
    );
  }

  return (
    <main className="exercise-card">
      <a className="dashboard-back" href="/curriculum">
        ← Xem chương trình học
      </a>

      <span className="topic-label">{topic}</span>
      <h1>Bài tập</h1>
      <p className="question-text">{exercise.question}</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="answer">Câu trả lời của bạn</label>
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
          {submitting ? 'Đang kiểm tra…' : 'Nộp bài'}
        </button>
      </form>

      {result && (
        <div className={`result-box ${result.correct ? 'result-correct' : 'result-incorrect'}`}>
          <p className="result-status">{result.correct ? 'Đúng' : 'Sai'}</p>
          <p className="result-level">
            Mức độ hiểu bài:{' '}
            <span className={`level-badge level-${result.understandingLevel.toLowerCase()}`}>
              {UNDERSTANDING_LABEL[result.understandingLevel]}
            </span>
          </p>
          <p className="result-explanation">{result.explanation}</p>
          <p className="result-suggestion">Gợi ý: {result.suggestion}</p>

          <div className="mastery-box">
            <div className="mastery-header">
              <span>Mức độ thành thạo {topic}</span>
              <span>{result.mastery.score}/100</span>
            </div>
            <div className="mastery-bar">
              <div
                className="mastery-bar-fill"
                style={{ width: `${result.mastery.score}%` }}
              />
            </div>
            <p className="mastery-attempts">
              {result.mastery.attempts} lượt thử
            </p>
          </div>

          <div className="gamification-box">
            <span className="xp-gain">+{result.correct ? 10 : 3} XP</span>
            <div className="gamification-stats">
              <span className="level-pill">Cấp độ {result.gamification.level}</span>
              <span className="streak-pill">🔥 Chuỗi {result.gamification.streak} ngày</span>
            </div>
          </div>

          <div className="recommendation-box">
            <p className="recommendation-message">{result.recommendation.message}</p>
            <p className="recommendation-action">Tiếp theo: {result.recommendation.nextAction}</p>
          </div>

          <p className="dashboard-link">
            <a href="/dashboard">Xem bảng điều khiển của tôi →</a>
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
          <p>Đang tải…</p>
        </main>
      }
    >
      <ExercisePageInner />
    </Suspense>
  );
}
