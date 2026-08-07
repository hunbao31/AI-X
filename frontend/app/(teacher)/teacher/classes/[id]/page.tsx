'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  ExerciseForm,
  ExercisePayload,
} from '@/components/exercise/ExerciseForm';
import { ImportQuestions } from '@/components/exercise/ImportQuestions';
import type { ClassDetail, TopicInfo, SkillCatalogChuong } from '@/lib/types';

function topicNameFor(chuongSgk: string, baiSgk: number, tenBai: string | null): string {
  const baiLabel = tenBai ? `Bài ${baiSgk}: ${tenBai}` : `Bài ${baiSgk}`;
  return `${chuongSgk} — ${baiLabel}`;
}

// Display-only labels for the member role — comparisons elsewhere stay on
// the original English enum values (e.g. m.role === 'teacher').
const ROLE_LABELS: Record<string, string> = {
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

export default function TeacherClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [catalog, setCatalog] = useState<SkillCatalogChuong[]>([]);
  const [selectedChuong, setSelectedChuong] = useState('');
  const [selectedBai, setSelectedBai] = useState<number | ''>('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicError, setTopicError] = useState('');

  // Which topic's inline "create exercise" panel is open — only one at a
  // time, and the form remounts (via formKey) after each successful create
  // so a teacher can add several questions in a row without stale fields.
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [exerciseSubmitting, setExerciseSubmitting] = useState(false);
  const [exerciseError, setExerciseError] = useState('');

  function toggleTopic(topicId: string) {
    setExpandedTopicId((prev) => (prev === topicId ? null : topicId));
    setImportMode(false);
  }

  const load = useCallback(() => {
    apiGet<ClassDetail>(`/api/v1/classes/${classId}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải lớp học.'),
      )
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(load, [load]);

  useEffect(() => {
    // Same chương/bài (SGK) catalog the diagnostic authoring page uses —
    // reused here so class topics line up with the real curriculum instead
    // of free-text labels.
    apiGet<SkillCatalogChuong[]>('/api/v1/diagnostic/skill-catalog')
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const baiOptions = catalog.find((c) => c.chuongSgk === selectedChuong)?.bais ?? [];

  async function handleAddTopic(e: FormEvent) {
    e.preventDefault();
    if (!selectedChuong || selectedBai === '') return;
    setTopicError('');

    const tenBai = baiOptions.find((b) => b.baiSgk === selectedBai)?.tenBai ?? null;
    const name = topicNameFor(selectedChuong, selectedBai, tenBai);
    const existing = detail?.topics.find((t) => t.name === name);
    if (existing) {
      // Bài này đã có chủ đề trong lớp — mở luôn panel tạo bài tập, khỏi
      // gọi API tạo trùng rồi phải xử lý lỗi TOPIC_ALREADY_EXISTS.
      setSelectedChuong('');
      setSelectedBai('');
      setExpandedTopicId(existing.id);
      return;
    }

    setAddingTopic(true);
    try {
      const created = await apiPost<TopicInfo>('/api/v1/topics', { name, classId });
      setSelectedChuong('');
      setSelectedBai('');
      load();
      setExpandedTopicId(created.id);
      setFormKey((k) => k + 1);
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : 'Không thể thêm chủ đề.');
    } finally {
      setAddingTopic(false);
    }
  }

  async function handleCreateExercise(payload: ExercisePayload) {
    setExerciseError('');
    setExerciseSubmitting(true);
    try {
      await apiPost('/api/v1/exercises', payload);
      setFormKey((k) => k + 1);
      load();
    } catch (err) {
      setExerciseError(err instanceof Error ? err.message : 'Không thể tạo bài tập.');
    } finally {
      setExerciseSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải lớp học…</p>;

  if (error || !detail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{error || 'Không tìm thấy lớp học.'}</p>
        <Link
          href="/teacher/classes"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại danh sách lớp học
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/teacher/classes"
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Tất cả lớp học
      </Link>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
          <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 font-mono text-lg font-bold tracking-widest text-indigo-300">
            {detail.code}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Chia sẻ mã này với học sinh để họ tham gia. {detail.members.length}{' '}
          thành viên.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Chủ đề</h2>
        <form onSubmit={handleAddTopic} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={selectedChuong}
            onChange={(e) => {
              setSelectedChuong(e.target.value);
              setSelectedBai('');
            }}
            className="input-base"
          >
            <option value="">Chọn chương</option>
            {catalog.map((c) => (
              <option key={c.chuongSgk} value={c.chuongSgk}>
                {c.chuongSgk}
              </option>
            ))}
          </select>
          <select
            value={selectedBai}
            onChange={(e) => setSelectedBai(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedChuong}
            className="input-base"
          >
            <option value="">{selectedChuong ? 'Chọn bài' : 'Chọn chương trước'}</option>
            {baiOptions.map((b) => (
              <option key={b.baiSgk} value={b.baiSgk}>
                Bài {b.baiSgk}
                {b.tenBai ? `: ${b.tenBai}` : ''}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!selectedChuong || selectedBai === '' || addingTopic}>
            {addingTopic ? 'Đang thêm…' : 'Thêm chủ đề'}
          </Button>
        </form>
        {topicError && <p className="text-sm text-red-400">{topicError}</p>}

        {detail.topics.length === 0 ? (
          <p className="text-sm text-slate-400">
            Chưa có chủ đề nào — chọn chương và bài ở trên để bắt đầu.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.topics.map((t) => {
              const isOpen = expandedTopicId === t.id;
              return (
                <div key={t.id} className="rounded-xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
                  >
                    <span className="text-sm font-medium text-slate-200">{t.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {t._count.exercises} bài tập
                      </span>
                      <span className="text-xs font-medium text-indigo-300">
                        {isOpen ? 'Đóng' : '+ Bài tập'}
                      </span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-white/10 p-4">
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
                          lockedTopicId={t.id}
                          onImported={() => {
                            setFormKey((k) => k + 1);
                            load();
                          }}
                        />
                      ) : (
                        <ExerciseForm
                          key={formKey}
                          lockedClassId={classId}
                          lockedTopicId={t.id}
                          submitLabel="Tạo bài tập"
                          submittingLabel="Đang tạo…"
                          submitting={exerciseSubmitting}
                          error={exerciseError}
                          onSubmit={handleCreateExercise}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Bộ đề</h2>
          <Link href="/teacher/sets">
            <Button variant="secondary">Quản lý bộ đề</Button>
          </Link>
        </div>
        {detail.sets.length === 0 ? (
          <p className="text-sm text-slate-400">
            Chưa có bộ đề nào được gắn với lớp học này.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.sets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {s._count.items} câu hỏi
                    {s.timeLimitPerQuestion
                      ? ` · ${s.timeLimitPerQuestion} giây mỗi câu`
                      : ' · không giới hạn thời gian'}
                  </p>
                </div>
                <Link href={`/teacher/sets/${s.id}`}>
                  <Button variant="secondary">Chỉnh sửa</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Thành viên</h2>
        <div className="space-y-2">
          {detail.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-200">
                <Avatar id={m.user.avatar} size={28} />
                <span className="truncate">{m.user.username}</span>
              </span>
              <Badge tone={m.role === 'teacher' ? 'indigo' : 'slate'}>
                {ROLE_LABELS[m.role] ?? m.role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
