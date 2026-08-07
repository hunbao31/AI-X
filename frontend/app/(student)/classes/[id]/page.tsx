'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { ClassDetail } from '@/lib/types';

// Display-only labels for the member role — comparisons elsewhere stay on
// the original English enum values (e.g. m.role === 'teacher').
const ROLE_LABELS: Record<string, string> = {
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

// Read-only mirror of the teacher class detail page — a student can see
// what's in their class (topics, sets, roster) but not manage any of it.
// GET /api/v1/classes/:id already 403s a non-member server-side (see
// ClassesService.assertMember), so a student who isn't in this class just
// sees the error state below, same as "class not found".
export default function StudentClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<ClassDetail>(`/api/v1/classes/${classId}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải lớp học.'),
      )
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <p className="text-slate-400">Đang tải lớp học…</p>;

  if (error || !detail) {
    return (
      <Card className="mx-auto max-w-3xl">
        <p className="text-red-400">{error || 'Không tìm thấy lớp học.'}</p>
        <Link
          href="/classes"
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
        href="/classes"
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Tất cả lớp học
      </Link>

      <Card className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
        <p className="text-sm text-slate-400">
          Giáo viên: {detail.teacher.username} · {detail.members.length} thành viên.
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Chủ đề</h2>
        {detail.topics.length === 0 ? (
          <p className="text-sm text-slate-400">Lớp học này chưa có chủ đề nào.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detail.topics.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200"
              >
                {t.name}
                <span className="ml-2 text-xs text-slate-500">
                  {t._count.exercises} bài tập
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Bộ đề</h2>
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
                <Link href={`/quiz/${s.id}`}>
                  <Button variant="secondary">Làm bài</Button>
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
