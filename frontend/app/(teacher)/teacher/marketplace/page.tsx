'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MarketplaceCard } from '@/components/quiz-builder/MarketplaceCard';
import { staggerContainer } from '@/lib/animations';
import { useUser } from '@/lib/user-context';
import type { MarketplaceSet, SetSummary } from '@/lib/types';

// Debounce search input so every keystroke doesn't fire a request.
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function MarketplacePage() {
  const { user } = useUser();

  // Kho de cua ban than (item 11a) -- danh sach rieng, khong lien quan
  // phan tim kiem cong khai ben duoi.
  const [mySets, setMySets] = useState<SetSummary[]>([]);
  const [mySetsLoading, setMySetsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiGet<SetSummary[]>('/api/v1/sets')
      .then((all) => setMySets(all.filter((s) => s.createdBy === user.id)))
      .catch(() => setMySets([]))
      .finally(() => setMySetsLoading(false));
  }, [user]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);

  const [sets, setSets] = useState<MarketplaceSet[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback((targetPage: number, query: string) => {
    const setBusy = targetPage === 1 ? setLoading : setLoadingMore;
    setBusy(true);
    setError('');
    const qs = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
    apiGetWithMeta<MarketplaceSet[]>(`/api/v1/sets/marketplace?page=${targetPage}${qs}`)
      .then(({ data, meta }) => {
        setSets((prev) => (targetPage === 1 ? data : [...prev, ...data]));
        setHasMore(meta.hasMore === true);
        setPage(targetPage);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải kho đề.'),
      )
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    load(1, debouncedSearch);
  }, [debouncedSearch, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Kho đề</h1>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Kho đề của tôi</h2>
          <Link href="/teacher/sets">
            <Button variant="secondary">Quản lý →</Button>
          </Link>
        </div>
        {mySetsLoading ? (
          <p className="text-sm text-slate-400">Đang tải…</p>
        ) : mySets.length === 0 ? (
          <p className="text-sm text-slate-400">
            Bạn chưa lưu bộ đề nào — tạo mới ở{' '}
            <Link href="/teacher/sets" className="text-indigo-300 hover:text-indigo-200">
              Tạo đề
            </Link>{' '}
            hoặc thêm một bộ công khai bên dưới.
          </p>
        ) : (
          <div className="space-y-2">
            {mySets.map((s) => (
              <Link
                key={s.id}
                href={`/teacher/sets/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
              >
                <span className="truncate text-sm text-slate-200">{s.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                  {s.isPublic && <Badge tone="green">công khai</Badge>}
                  {s._count.items} câu hỏi
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-white">Các bộ đề công khai</h2>
        <p className="mt-1 text-sm text-slate-400">
          Chia sẻ bởi giáo viên khác. Thêm về sẽ tạo một bản sao riêng mà bạn
          hoàn toàn sở hữu — có thể chỉnh sửa hoặc xóa tùy ý.
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm kiếm bộ đề công khai…"
        className="input-base"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải kho đề…</p>
      ) : sets.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có bộ đề công khai nào — hãy xuất bản một bộ đề của bạn từ{' '}
            <Link href="/teacher/sets" className="text-indigo-300 hover:text-indigo-200">
              Bộ đề của tôi
            </Link>{' '}
            để xem tại đây.
          </p>
        </Card>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sets.map((set) => (
              <MarketplaceCard key={set.id} set={set} />
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => load(page + 1, debouncedSearch)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Đang tải…' : 'Tải thêm'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
