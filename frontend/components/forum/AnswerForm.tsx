'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ImagePicker } from './ImagePicker';

interface AnswerFormProps {
  onSubmit: (content: string, image: File | null) => Promise<void>;
  submitting: boolean;
}

const MIN_LENGTH = 2;

export function AnswerForm({ onSubmit, submitting }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (content.trim().length < MIN_LENGTH) {
      setError(`Câu trả lời phải có ít nhất ${MIN_LENGTH} ký tự.`);
      return;
    }
    setError('');
    try {
      await onSubmit(content.trim(), image);
      setContent('');
      setImage(null);
      setShowImagePicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng câu trả lời của bạn.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Chia sẻ cách bạn giải bài này… Hỗ trợ LaTeX: $x^2$"
        disabled={submitting}
        className="input-base"
      />

      {showImagePicker ? (
        <ImagePicker onChange={setImage} disabled={submitting} />
      ) : (
        <button
          type="button"
          onClick={() => setShowImagePicker(true)}
          className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          + Thêm ảnh
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={submitting || content.trim().length < MIN_LENGTH}>
        {submitting ? 'Đang đăng…' : 'Đăng câu trả lời'}
      </Button>
    </form>
  );
}
