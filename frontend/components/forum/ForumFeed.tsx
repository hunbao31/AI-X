'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiGetWithMeta } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PostCard } from './PostCard';
import { useClickSound } from '@/lib/useClickSound';
import { staggerContainer, springSmooth } from '@/lib/animations';
import type { ForumPostSummary, ForumSort } from '@/lib/types';

interface SortTab {
  id: ForumSort;
  label: string;
}

const SORT_TABS: SortTab[] = [
  { id: 'newest', label: '🕐 Mới nhất' },
  { id: 'most_answered', label: '💬 Nhiều câu trả lời nhất' },
  { id: 'most_rewarded', label: '⚡ Nhiều XP nhất' },
];

interface ForumFeedProps {
  /** '/forum' for students, '/teacher/forum' for teachers. */
  basePath: string;
}

export function ForumFeed({ basePath }: ForumFeedProps) {
  const playClick = useClickSound();
  const [sort, setSort] = useState<ForumSort>('newest');
  const [posts, setPosts] = useState<ForumPostSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback((targetSort: ForumSort, targetPage: number) => {
    const setBusy = targetPage === 1 ? setLoading : setLoadingMore;
    setBusy(true);
    setError('');
    apiGetWithMeta<ForumPostSummary[]>(
      `/api/v1/forum/posts?sort=${targetSort}&page=${targetPage}`,
    )
      .then(({ data, meta }) => {
        setPosts((prev) => (targetPage === 1 ? data : [...prev, ...data]));
        setHasMore(meta.hasMore === true);
        setPage(targetPage);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải diễn đàn.'),
      )
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    load(sort, 1);
  }, [sort, load]);

  function changeSort(next: ForumSort) {
    if (next === sort) return;
    playClick();
    setSort(next);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Diễn đàn cộng đồng</h1>
        <Link href={`${basePath}/new`}>
          <Button>📷 Đặt câu hỏi</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {SORT_TABS.map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => changeSort(tab.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springSmooth}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              sort === tab.id
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải câu hỏi…</p>
      ) : posts.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có câu hỏi nào — hãy là người đầu tiên đặt câu hỏi! Chụp ảnh
            bài toán bạn đang gặp khó khăn.
          </p>
        </Card>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} basePath={basePath} />
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => load(sort, page + 1)}
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
