'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ClassSummary } from '@/lib/types';

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  function load() {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp học.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setJoinError('');
    setJoining(true);
    try {
      await apiPost('/api/v1/classes/join', { code: code.trim() });
      setCode('');
      load();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Không thể tham gia lớp học.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Lớp học</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tham gia lớp học</h2>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã lớp học"
            required
            className="input-base flex-1"
          />
          <Button type="submit" disabled={joining}>
            {joining ? 'Đang tham gia…' : 'Tham gia'}
          </Button>
        </form>
        {joinError && <p className="text-sm text-red-400">{joinError}</p>}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải danh sách lớp học…</p>
      ) : classes.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Bạn chưa tham gia lớp học nào — nhập mã lớp ở trên để tham gia.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="block">
              <Card className="flex items-center justify-between gap-4 py-4 transition-transform hover:scale-[1.01]">
                <div>
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Giáo viên: {c.teacher.username} · {c._count.members} thành viên ·{' '}
                    {c._count.topics} chủ đề · {c._count.sets} bộ đề
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
