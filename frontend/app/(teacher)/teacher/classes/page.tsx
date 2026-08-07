'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ClassSummary } from '@/lib/types';

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function load() {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp học.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await apiPost('/api/v1/classes', { name });
      setName('');
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo lớp học.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Lớp học</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tạo lớp học</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Đại số — Tiết 3"
            required
            className="input-base flex-1"
          />
          <Button type="submit" disabled={creating}>
            {creating ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </form>
        {createError && <p className="text-sm text-red-400">{createError}</p>}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải danh sách lớp học…</p>
      ) : classes.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có lớp học nào — tạo một lớp ở trên và chia sẻ mã tham gia với
            học sinh của bạn.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`} className="block">
              <Card className="flex items-center justify-between gap-4 py-4 transition-transform hover:scale-[1.01]">
                <div>
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c._count.members} thành viên · {c._count.topics} chủ đề ·{' '}
                    {c._count.sets} bộ đề
                  </p>
                </div>
                <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-indigo-300">
                  {c.code}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
