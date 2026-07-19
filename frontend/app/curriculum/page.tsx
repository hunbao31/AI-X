'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

interface CurriculumTopic {
  id: string;
  name: string;
  exercises: { id: string }[];
}

interface CurriculumGrade {
  id: string;
  name: string;
  topics: CurriculumTopic[];
}

export default function CurriculumPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<CurriculumGrade[] | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<CurriculumGrade | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }

    apiGet<CurriculumGrade[]>('/api/v1/curriculum')
      .then(setGrades)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load curriculum.'),
      )
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="curriculum-page">
        <p>Loading curriculum…</p>
      </main>
    );
  }

  if (error || !grades) {
    return (
      <main className="curriculum-page">
        <p className="error-text">{error || 'No curriculum available.'}</p>
      </main>
    );
  }

  return (
    <main className="curriculum-page">
      <a className="dashboard-back" href="/dashboard">
        ← Back to dashboard
      </a>

      <h1 className="curriculum-title">Curriculum</h1>

      {!selectedGrade ? (
        <div className="curriculum-grid">
          {grades.map((grade) => (
            <button
              key={grade.id}
              type="button"
              className="curriculum-card"
              onClick={() => setSelectedGrade(grade)}
            >
              <span className="curriculum-card-title">{grade.name}</span>
              <span className="curriculum-card-meta">
                {grade.topics.length} topic{grade.topics.length === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="curriculum-back-inline"
            onClick={() => setSelectedGrade(null)}
          >
            ← All grades
          </button>

          <div className="curriculum-grid">
            {selectedGrade.topics.map((topic) => (
              <a
                key={topic.id}
                className="curriculum-card"
                href={`/exercise?topic=${topic.id}`}
              >
                <span className="curriculum-card-title">{topic.name}</span>
                <span className="curriculum-card-meta">
                  {topic.exercises.length} exercise
                  {topic.exercises.length === 1 ? '' : 's'}
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
