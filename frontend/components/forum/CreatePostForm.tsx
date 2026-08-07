'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiUpload } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { ImagePicker } from './ImagePicker';
import { useMascot } from '@/components/mascot/MascotProvider';
import { useSounds } from '@/lib/sounds';
import type { ClassSummary, TopicInfo, ForumPostSummary } from '@/lib/types';

interface CreatePostFormProps {
  /** '/forum' for students, '/teacher/forum' for teachers. */
  basePath: string;
}

// Photo is the whole point here — manual typing of the question is
// secondary (an optional description), the reverse of the exercise-bank
// creation flow.
export function CreatePostForm({ basePath }: CreatePostFormProps) {
  const router = useRouter();
  const { playPop } = useSounds();
  const mascot = useMascot();

  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }
    apiGet<TopicInfo[]>(`/api/v1/topics?classId=${selectedClassId}`)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [selectedClassId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!image) {
      setError('Vui lòng thêm ảnh cho câu hỏi của bạn.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('image', image);
      if (description.trim()) form.append('description', description.trim());
      if (selectedTopicId) form.append('topicId', selectedTopicId);
      else if (selectedClassId) form.append('classId', selectedClassId);

      const post = await apiUpload<ForumPostSummary>('/api/v1/forum/posts', form);
      playPop();
      mascot.react('gotit', 'Đã đăng câu hỏi! 🎉');
      router.push(`${basePath}/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng câu hỏi của bạn.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Hỏi cộng đồng</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ImagePicker onChange={setImage} disabled={submitting} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Mô tả <span className="text-slate-500">(không bắt buộc)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Bạn đang gặp khó khăn ở đâu? Hỗ trợ LaTeX: $x^2$"
              className="input-base"
            />
            {description.includes('$') && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <span className="mr-2 text-xs uppercase tracking-wide text-slate-500">
                  Xem trước
                </span>
                <MathText text={description} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Lớp học <span className="text-slate-500">(không bắt buộc)</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-base"
              >
                <option value="">Công khai (mọi người)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Chủ đề <span className="text-slate-500">(không bắt buộc)</span>
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                disabled={!selectedClassId || topics.length === 0}
                className="input-base"
              >
                <option value="">
                  {selectedClassId
                    ? topics.length === 0
                      ? 'Lớp học chưa có chủ đề nào'
                      : 'Không chọn chủ đề cụ thể'
                    : 'Hãy chọn lớp học trước'}
                </option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {selectedClassId
              ? 'Chỉ thành viên của lớp học này mới thấy được câu hỏi này.'
              : 'Hiển thị với toàn bộ cộng đồng.'}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={submitting || !image} className="w-full">
            {submitting ? 'Đang đăng…' : 'Đăng câu hỏi'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
