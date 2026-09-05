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
      setError(err instanceof Error ? err.message : 'Không thể tạo bài tập.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-white">Tạo bài tập</h1>
          <a
            href="/teacher/manage?import=1"
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            Nhiều câu hỏi? Nhập từ CSV/Excel →
          </a>
        </div>
        <ExerciseForm
          submitLabel="Tạo bài tập"
          submittingLabel="Đang tạo…"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
