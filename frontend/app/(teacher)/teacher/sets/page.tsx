'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getStoredUser } from '@/lib/session';
import type { ClassSummary, SetSummary, QuizMode } from '@/lib/types';

export default function TeacherSetsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [mode, setMode] = useState<QuizMode>('practice');
  const [timeLimit, setTimeLimit] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function load() {
    Promise.all([
      apiGet<SetSummary[]>('/api/v1/sets'),
      apiGet<ClassSummary[]>('/api/v1/classes'),
    ])
      .then(([setList, classList]) => {
        const me = getStoredUser();
        // The list endpoint returns everything visible (incl. others' public
        // sets); the management page only shows the teacher's own.
        setSets(me ? setList.filter((s) => s.createdBy === me.id) : setList);
        setClasses(classList);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách bộ đề.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const created = await apiPost<SetSummary>('/api/v1/sets', {
        title,
        description: description.trim() === '' ? null : description,
        classId: classId === '' ? null : classId,
        isPublic,
        mode,
        timeLimitPerQuestion: timeLimit === '' ? null : Number(timeLimit),
      });
      // Straight into the builder — creating a set is step one of "author
      // questions fast," not a detour back through a list.
      router.push(`/teacher/sets/${created.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo bộ đề.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Tạo đề</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tạo bộ đề</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề, VD: Vòng tốc độ Đại số"
            required
            className="input-base"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (không bắt buộc)"
            rows={2}
            className="input-base"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Lớp học
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="input-base"
              >
                <option value="">Không thuộc lớp (độc lập)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Chế độ
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as QuizMode)}
                className="input-base"
              >
                <option value="practice">Luyện tập — phản hồi ngay</option>
                <option value="exam">Kiểm tra — ẩn đáp án</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Số giây mỗi câu
              </label>
              <input
                type="number"
                min={5}
                max={600}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Không giới hạn thời gian"
                className="input-base"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                Công khai
              </label>
            </div>
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <Button type="submit" disabled={creating}>
            {creating ? 'Đang tạo…' : 'Tạo bộ đề'}
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải danh sách bộ đề…</p>
      ) : sets.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có bộ đề nào — tạo một bộ ở trên, sau đó thêm câu hỏi vào.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sets.map((s) => (
            <Card
              key={s.id}
              className="flex items-center justify-between gap-4 py-4 transition-transform hover:scale-[1.01]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{s.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {s.isPublic ? (
                    <Badge tone="green">công khai</Badge>
                  ) : s.class ? (
                    <Badge tone="indigo">{s.class.name}</Badge>
                  ) : (
                    <Badge>riêng tư</Badge>
                  )}
                  <span className="text-xs text-slate-400">
                    {s._count.items} câu hỏi · {s._count.attempts} lượt làm
                  </span>
                </div>
              </div>
              <Link href={`/teacher/sets/${s.id}`}>
                <Button variant="secondary">Quản lý</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
