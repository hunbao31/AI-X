'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useUser } from '@/lib/user-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  ExerciseForm,
  ExercisePayload,
} from '@/components/exercise/ExerciseForm';
import { ImportQuestions } from '@/components/exercise/ImportQuestions';
import type {
  ClassDetail,
  TopicInfo,
  SkillCatalogChuong,
  ClassStudentReport,
  Exercise,
  SetSummary,
} from '@/lib/types';

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
  const router = useRouter();
  const classId = params.id;
  const { user } = useUser();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteClass() {
    if (!window.confirm('Xóa lớp học này? Toàn bộ chủ đề và thành viên sẽ mất — hành động không thể hoàn tác.')) {
      return;
    }
    setDeleteError('');
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/classes/${classId}`);
      router.push('/teacher/classes');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Không thể xóa lớp học.');
      setDeleting(false);
    }
  }

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

  // Danh sach cau hoi da co trong topic dang mo -- tai lai moi lan mo panel
  // hoac sau khi them/nhap thanh cong, de giao vien thay ngay ket qua.
  const [topicExercises, setTopicExercises] = useState<Exercise[]>([]);
  const [topicExercisesLoading, setTopicExercisesLoading] = useState(false);

  const loadTopicExercises = useCallback((topicId: string) => {
    setTopicExercisesLoading(true);
    apiGet<Exercise[]>(`/api/v1/exercises?topicId=${topicId}`)
      .then(setTopicExercises)
      .catch(() => setTopicExercises([]))
      .finally(() => setTopicExercisesLoading(false));
  }, []);

  function toggleTopic(topicId: string) {
    setExpandedTopicId((prev) => {
      const next = prev === topicId ? null : topicId;
      if (next) loadTopicExercises(next);
      return next;
    });
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

  const [studentReports, setStudentReports] = useState<ClassStudentReport[]>([]);
  const [studentReportsLoading, setStudentReportsLoading] = useState(true);
  const [studentReportsError, setStudentReportsError] = useState('');

  useEffect(() => {
    setStudentReportsLoading(true);
    apiGet<ClassStudentReport[]>(`/api/v1/diagnostic/classes/${classId}/students-report`)
      .then(setStudentReports)
      .catch((err) =>
        setStudentReportsError(err instanceof Error ? err.message : 'Không thể tải.'),
      )
      .finally(() => setStudentReportsLoading(false));
  }, [classId]);

  const baiOptions = catalog.find((c) => c.chuongSgk === selectedChuong)?.bais ?? [];

  // Kho bo de rieng cua giao vien (chua gan lop nao) -- ung vien de "gan vao
  // lop" (item 5), tach biet voi tao-moi (giu nguyen luong /teacher/sets).
  const [librarySets, setLibrarySets] = useState<SetSummary[]>([]);
  const [selectedLibrarySetId, setSelectedLibrarySetId] = useState('');
  const [setActionError, setSetActionError] = useState('');
  const [attachingSet, setAttachingSet] = useState(false);
  const [removingSetId, setRemovingSetId] = useState<string | null>(null);

  const loadLibrarySets = useCallback(() => {
    apiGet<SetSummary[]>('/api/v1/sets')
      .then(setLibrarySets)
      .catch(() => setLibrarySets([]));
  }, []);

  useEffect(loadLibrarySets, [loadLibrarySets]);

  const libraryCandidates = librarySets.filter(
    (s) => s.createdBy === user?.id && s.classId === null,
  );

  async function handleAttachSet() {
    if (!selectedLibrarySetId) return;
    setSetActionError('');
    setAttachingSet(true);
    try {
      await apiPatch(`/api/v1/sets/${selectedLibrarySetId}`, { classId });
      setSelectedLibrarySetId('');
      load();
      loadLibrarySets();
    } catch (err) {
      setSetActionError(err instanceof Error ? err.message : 'Không thể thêm bộ đề vào lớp.');
    } finally {
      setAttachingSet(false);
    }
  }

  async function handleDetachSet(setId: string) {
    setSetActionError('');
    setRemovingSetId(setId);
    try {
      await apiPatch(`/api/v1/sets/${setId}`, { classId: null });
      load();
      loadLibrarySets();
    } catch (err) {
      setSetActionError(err instanceof Error ? err.message : 'Không thể xóa bộ đề khỏi lớp.');
    } finally {
      setRemovingSetId(null);
    }
  }

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
      if (expandedTopicId) loadTopicExercises(expandedTopicId);
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
        {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
        <button
          type="button"
          onClick={handleDeleteClass}
          disabled={deleting}
          className="text-xs font-medium text-red-400 hover:text-red-300"
        >
          {deleting ? 'Đang xóa…' : 'Xóa lớp học'}
        </button>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Câu tự luận chờ duyệt</h2>
          <p className="text-xs text-slate-400">Đọc và tự đánh giá câu trả lời của học sinh.</p>
        </div>
        <Link href={`/teacher/classes/${classId}/review`}>
          <Button variant="secondary">Duyệt bài</Button>
        </Link>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Thêm chủ đề</h2>
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
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Câu hỏi đã thêm
                        </p>
                        {topicExercisesLoading ? (
                          <p className="text-xs text-slate-500">Đang tải…</p>
                        ) : topicExercises.length === 0 ? (
                          <p className="text-xs text-slate-500">Chưa có câu hỏi nào trong chủ đề này.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {topicExercises.map((ex) => (
                              <div
                                key={ex.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                                  {ex.question}
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
                      </div>

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
                            if (expandedTopicId) loadTopicExercises(expandedTopicId);
                          }}
                        />
                      ) : (
                        <ExerciseForm
                          key={formKey}
                          lockedClassId={classId}
                          lockedTopicId={t.id}
                          submitLabel="Thêm bài tập vào chủ đề"
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
          <h2 className="text-lg font-semibold text-white">Thêm bộ đề</h2>
          <Link href="/teacher/sets">
            <Button variant="secondary">Tạo mới</Button>
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedLibrarySetId}
            onChange={(e) => setSelectedLibrarySetId(e.target.value)}
            className="input-base flex-1"
          >
            <option value="">
              {libraryCandidates.length === 0 ? 'Không có bộ đề nào trong kho' : 'Chọn bộ đề từ kho'}
            </option>
            {libraryCandidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={!selectedLibrarySetId || attachingSet}
            onClick={handleAttachSet}
          >
            {attachingSet ? 'Đang thêm…' : 'Thêm vào lớp'}
          </Button>
        </div>
        {setActionError && <p className="text-sm text-red-400">{setActionError}</p>}

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
                <div className="flex shrink-0 gap-2">
                  <Link href={`/teacher/sets/${s.id}`}>
                    <Button variant="secondary">Chỉnh sửa</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    disabled={removingSetId === s.id}
                    onClick={() => handleDetachSet(s.id)}
                  >
                    {removingSetId === s.id ? 'Đang xóa…' : 'Xóa khỏi lớp'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Mức độ hiểu từng học sinh (AI)</h2>
        {studentReportsLoading ? (
          <p className="text-sm text-slate-400">Đang phân tích…</p>
        ) : studentReportsError ? (
          <p className="text-sm text-red-400">{studentReportsError}</p>
        ) : studentReports.length === 0 ? (
          <p className="text-sm text-slate-400">Lớp chưa có học sinh nào.</p>
        ) : (
          <div className="space-y-2">
            {studentReports.map((r) => (
              <div
                key={r.userId}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
              >
                <span className="truncate text-sm text-slate-200">{r.username}</span>
                {r.percent === null ? (
                  <span className="shrink-0 text-xs text-slate-500">
                    Chưa có dữ liệu chẩn đoán
                  </span>
                ) : (
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      r.percent < 50
                        ? 'text-red-300'
                        : r.percent < 75
                          ? 'text-yellow-300'
                          : 'text-green-300'
                    }`}
                  >
                    {r.percent}% hiểu bài
                  </span>
                )}
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
