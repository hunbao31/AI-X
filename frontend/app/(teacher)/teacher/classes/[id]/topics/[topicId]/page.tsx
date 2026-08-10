'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import {
  ExerciseForm,
  ExercisePayload,
} from '@/components/exercise/ExerciseForm';
import { ImportQuestions } from '@/components/exercise/ImportQuestions';
import type { ClassDetail, Exercise } from '@/lib/types';

// Dedicated page per topic, reached by clicking a topic on the class page —
// mirrors how a set gets its own page (/teacher/sets/:id) instead of being
// managed in an accordion embedded in a list.
export default function TeacherTopicDetailPage() {
  const params = useParams<{ id: string; topicId: string }>();
  const classId = params.id;
  const topicId = params.topicId;

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState('');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);

  const [importMode, setImportMode] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<ClassDetail>(`/api/v1/classes/${classId}`)
      .then(setClassDetail)
      .catch((err) =>
        setClassError(err instanceof Error ? err.message : 'Không thể tải lớp học.'),
      )
      .finally(() => setClassLoading(false));
  }, [classId]);

  const loadExercises = useCallback(() => {
    setExercisesLoading(true);
    apiGet<Exercise[]>(`/api/v1/exercises?topicId=${topicId}`)
      .then(setExercises)
      .catch(() => setExercises([]))
      .finally(() => setExercisesLoading(false));
  }, [topicId]);

  useEffect(loadExercises, [loadExercises]);

  async function handleCreateExercise(payload: ExercisePayload) {
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/api/v1/exercises', payload);
      setFormKey((k) => k + 1);
      loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo bài tập.');
    } finally {
      setSubmitting(false);
    }
  }

  if (classLoading) return <p className="text-slate-400">Đang tải…</p>;

  if (classError || !classDetail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{classError || 'Không tìm thấy lớp học.'}</p>
        <Link
          href="/teacher/classes"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại danh sách lớp học
        </Link>
      </Card>
    );
  }

  const topic = classDetail.topics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">Không tìm thấy chủ đề này trong lớp.</p>
        <Link
          href={`/teacher/classes/${classId}`}
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại {classDetail.name}
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/teacher/classes/${classId}`}
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← {classDetail.name}
      </Link>

      <Card className="space-y-1">
        <h1 className="text-2xl font-bold text-white">{topic.name}</h1>
        <p className="text-sm text-slate-400">{exercises.length} câu hỏi</p>
      </Card>

      <Card className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Câu hỏi đã thêm
        </p>
        {exercisesLoading ? (
          <p className="text-sm text-slate-400">Đang tải…</p>
        ) : exercises.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có câu hỏi nào trong chủ đề này.</p>
        ) : (
          <div className="space-y-1.5">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  <MathText text={ex.question} />
                </span>
                <Link
                  href={`/teacher/exercises/${ex.id}/edit`}
                  className="shrink-0 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Chỉnh sửa
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportMode(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              !importMode
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            Từng câu
          </button>
          <button
            type="button"
            onClick={() => setImportMode(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              importMode
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            Nhập CSV/Excel
          </button>
        </div>

        {importMode ? (
          <ImportQuestions
            key={formKey}
            lockedClassId={classId}
            lockedTopicId={topicId}
            onImported={() => {
              setFormKey((k) => k + 1);
              loadExercises();
            }}
          />
        ) : (
          <ExerciseForm
            key={formKey}
            lockedClassId={classId}
            lockedTopicId={topicId}
            submitLabel="Thêm bài tập vào chủ đề"
            submittingLabel="Đang tạo…"
            submitting={submitting}
            error={error}
            onSubmit={handleCreateExercise}
          />
        )}
      </Card>
    </div>
  );
}
