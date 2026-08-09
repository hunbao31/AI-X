'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { MathText } from '@/components/ui/MathText';
import { staggerContainer, fadeSlideUp } from '@/lib/animations';
import type { FavoriteEntry } from '@/lib/types';

export default function SavedQuestionsPage() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<FavoriteEntry[]>('/api/v1/favorites')
      .then(setFavorites)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách câu hỏi đã lưu.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function remove(exerciseId: string) {
    setFavorites((prev) => prev.filter((f) => f.exercise.id !== exerciseId));
    await apiDelete(`/api/v1/favorites/${exerciseId}`).catch(() => undefined);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">⭐ Câu hỏi đã lưu</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải câu hỏi đã lưu…</p>
      ) : favorites.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có câu hỏi nào được lưu — nhấn vào biểu tượng sao ☆ ở bất kỳ
            câu hỏi nào trong phần xem lại bài trắc nghiệm để lưu vào đây.
          </p>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {favorites.map((f) => (
            <motion.div key={f.id} variants={fadeSlideUp}>
              <Card className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    <MathText text={f.exercise.question} />
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="indigo">{f.exercise.type.toUpperCase()}</Badge>
                    <DifficultyBadge difficulty={f.exercise.difficulty} />
                    <span className="text-xs text-slate-400">{f.exercise.topic}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/practice?topic=${encodeURIComponent(f.exercise.topic)}`}>
                    <Button variant="secondary">Luyện tập chủ đề</Button>
                  </Link>
                  <Button variant="danger" onClick={() => void remove(f.exercise.id)}>
                    Xóa
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
