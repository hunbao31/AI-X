'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import {
  ExerciseForm,
  ExercisePayload,
} from '@/components/exercise/ExerciseForm';
import type { Exercise } from '@/lib/types';

export default function TeacherEditExercisePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Exercise | null>(`/api/v1/exercises/${params.id}`)
      .then((ex) => {
        if (!ex) setLoadError('Không tìm thấy bài tập.');
        setExercise(ex);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Không thể tải bài tập.'),
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(payload: ExercisePayload) {
    setError('');
    setSubmitting(true);
    try {
      await apiPatch(`/api/v1/exercises/${params.id}`, payload);
      router.push('/teacher/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật bài tập.');
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải bài tập…</p>;

  if (loadError || !exercise) {
    return (
      <Card className="mx-auto max-w-2xl">
        <p className="text-red-400">{loadError || 'Không tìm thấy bài tập.'}</p>
        <Link
          href="/teacher/manage"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại danh sách bài tập
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Chỉnh sửa bài tập</h1>
          <Link
            href="/teacher/manage"
            className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
          >
            ← Quay lại
          </Link>
        </div>
        <ExerciseForm
          initial={exercise}
          submitLabel="Lưu thay đổi"
          submittingLabel="Đang lưu…"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
