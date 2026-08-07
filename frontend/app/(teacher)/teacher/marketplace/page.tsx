'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiGetWithMeta } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarketplaceCard } from '@/components/quiz-builder/MarketplaceCard';
import { staggerContainer } from '@/lib/animations';
import type { MarketplaceSet } from '@/lib/types';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kho đề</h1>
          <p className="mt-1 text-sm text-slate-400">
            Các bộ đề công khai được chia sẻ bởi giáo viên khác. Nhập về sẽ
            tạo một bản sao riêng mà bạn hoàn toàn sở hữu — có thể chỉnh
            sửa hoặc xóa tùy ý.
          </p>
        </div>
        <Link href="/teacher/sets">
          <Button variant="secondary">Bộ đề của tôi →</Button>
        </Link>
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
