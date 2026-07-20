'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import {
  ExerciseForm,
  ExercisePayload,
} from '@/components/exercise/ExerciseForm';

export default function TeacherCreatePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(payload: ExercisePayload) {
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/api/v1/exercises', payload);
      router.push('/teacher/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-white">Create Exercise</h1>
          <a
            href="/teacher/manage?import=1"
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            Many questions? Import from CSV →
          </a>
        </div>
        <ExerciseForm
          submitLabel="Create Exercise"
          submittingLabel="Creating…"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
