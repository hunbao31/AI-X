'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { SetSummary } from '@/lib/types';

export default function QuizzesPage() {
  const router = useRouter();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    apiGet<SetSummary[]>('/api/v1/sets')
      .then(setSets)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách trắc nghiệm.'),
      )
      .finally(() => setLoading(false));
  }, []);

  // Private-by-code quizzes are not listed; the code is the way in.
  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setCodeError('');
    setUnlocking(true);
    try {
      const found = await apiGet<{ id: string; title: string }>(
        `/api/v1/sets/by-code/${encodeURIComponent(code)}`,
      );
      router.push(`/quiz/${found.id}?code=${encodeURIComponent(code)}`);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Không tìm thấy bài trắc nghiệm nào khớp với mã đó.');
      setUnlocking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Trắc nghiệm</h1>

      <Card className="space-y-2">
        <form onSubmit={handleUnlock} className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Bạn có mã bài trắc nghiệm? Nhập vào đây"
            className="input-base flex-1"
          />
          <Button type="submit" variant="secondary" disabled={unlocking}>
            {unlocking ? 'Đang mở…' : 'Mở khóa'}
          </Button>
        </form>
        {codeError && <p className="text-sm text-red-400">{codeError}</p>}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải danh sách trắc nghiệm…</p>
      ) : sets.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có bài trắc nghiệm nào. Tham gia lớp học để xem bài trắc
            nghiệm của lớp, hoặc quay lại sau để xem các bài công khai.
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
                {s.description && (
                  <p className="mt-0.5 truncate text-sm text-slate-400">{s.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {s.isPublic ? (
                    <Badge tone="green">công khai</Badge>
                  ) : s.class ? (
                    <Badge tone="indigo">{s.class.name}</Badge>
                  ) : (
                    <Badge>riêng tư</Badge>
                  )}
                  <span className="text-xs text-slate-400">
                    {s._count.items} câu hỏi
                    {s.timeLimitPerQuestion
                      ? ` · ${s.timeLimitPerQuestion} giây mỗi câu`
                      : ' · không giới hạn thời gian'}
                    {' · bởi '}
                    {s.creator.username}
                  </span>
                </div>
              </div>
              <Link href={`/quiz/${s.id}`}>
                <Button variant="secondary">Mở</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
