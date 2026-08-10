'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { SetSummary, MarketplaceSet } from '@/lib/types';

// Debounce search input so every keystroke doesn't fire a request.
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function QuizzesPage() {
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<SetSummary[]>('/api/v1/sets')
      .then(setSets)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải ngân hàng câu hỏi.'),
      )
      .finally(() => setLoading(false));
  }, []);

  // Chỗ tách biệt để làm cac đề công khai không thuộc lớp học cua minh --
  // tim kiem truc tiep tren kho de cong khai (cung endpoint marketplace cua
  // giao vien), mo la choi luon (khong "nhap ve" nhu ben giao vien).
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const [publicSets, setPublicSets] = useState<MarketplaceSet[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');

  const loadPublic = useCallback((query: string) => {
    setPublicLoading(true);
    setPublicError('');
    const qs = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : '';
    apiGetWithMeta<MarketplaceSet[]>(`/api/v1/sets/marketplace${qs}`)
      .then(({ data }) => setPublicSets(data))
      .catch((err) =>
        setPublicError(err instanceof Error ? err.message : 'Không thể tìm đề công khai.'),
      )
      .finally(() => setPublicLoading(false));
  }, []);

  useEffect(() => {
    loadPublic(debouncedSearch);
  }, [debouncedSearch, loadPublic]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ngân hàng câu hỏi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bộ đề của lớp bạn, và một chỗ riêng để tìm làm các đề công khai không
          thuộc lớp học nào — kể cả đề có phần tự luận.
        </p>
      </div>

      <Card className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm đề công khai…"
          className="input-base"
        />
        {publicError && <p className="text-sm text-red-400">{publicError}</p>}
        {publicLoading ? (
          <p className="text-sm text-slate-400">Đang tìm…</p>
        ) : publicSets.length === 0 ? (
          <p className="text-sm text-slate-400">
            {search.trim() ? 'Không tìm thấy đề công khai nào khớp.' : 'Chưa có đề công khai nào.'}
          </p>
        ) : (
          <div className="space-y-2">
            {publicSets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.title}</p>
                  <span className="text-xs text-slate-400">
                    {s._count.items} câu hỏi · bởi {s.creator.username}
                  </span>
                </div>
                <Link href={`/quiz/${s.id}`}>
                  <Button variant="secondary">Mở</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải…</p>
      ) : sets.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có bài nào trong ngân hàng của bạn. Tham gia lớp học để xem
            bài của lớp, hoặc tìm một đề công khai ở trên.
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
