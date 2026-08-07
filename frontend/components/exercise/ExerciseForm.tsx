'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import type {
  ClassSummary,
  TopicInfo,
  Exercise,
  ExerciseType,
  Difficulty,
} from '@/lib/types';

export interface ExercisePayload {
  question: string;
  type: ExerciseType;
  difficulty: Difficulty;
  topic?: string;
  topicId?: string | null;
  answer: string;
  options?: string[];
}

interface ExerciseFormProps {
  initial?: Exercise;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  error: string;
  onSubmit: (payload: ExercisePayload) => void;
  // When both are set, the class/topic picker is skipped entirely and every
  // exercise submitted links straight to this topic — used to embed the form
  // inline under an already-selected class topic (see teacher/classes/[id]).
  lockedClassId?: string;
  lockedTopicId?: string;
}

const EMPTY_OPTIONS = ['', '', '', ''];

// Shared by Create Exercise and Edit Exercise. The topic can be a free-text
// label, or — when a class + class topic are selected — a link to that Topic
// (the backend then keeps the label in sync with the topic's name).
export function ExerciseForm({
  initial,
  submitLabel,
  submittingLabel,
  submitting,
  error,
  onSubmit,
  lockedClassId,
  lockedTopicId,
}: ExerciseFormProps) {
  const isLocked = Boolean(lockedClassId && lockedTopicId);

  const [question, setQuestion] = useState(initial?.question ?? '');
  const [type, setType] = useState<ExerciseType>(initial?.type ?? 'mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty ?? 'easy',
  );
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [options, setOptions] = useState<string[]>(() => {
    const existing = initial?.options ?? [];
    return existing.length > 0
      ? [...existing, ...EMPTY_OPTIONS].slice(0, Math.max(4, existing.length))
      : EMPTY_OPTIONS;
  });
  const [answer, setAnswer] = useState(initial?.answer ?? '');

  // Optional class-topic link — unused entirely when isLocked.
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState(initial?.topicId ?? '');

  useEffect(() => {
    if (isLocked) return;
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [isLocked]);

  useEffect(() => {
    if (isLocked || !selectedClassId) {
      setTopics([]);
      return;
    }
    apiGet<TopicInfo[]>(`/api/v1/topics?classId=${selectedClassId}`)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [isLocked, selectedClassId]);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLocked) {
      onSubmit({
        question,
        type,
        difficulty,
        topicId: lockedTopicId,
        answer,
        options:
          type === 'mcq' ? options.filter((o) => o.trim() !== '') : undefined,
      });
      return;
    }
    onSubmit({
      question,
      type,
      difficulty,
      // A selected class topic wins; otherwise the free-text label is used.
      topicId: selectedTopicId || (initial?.topicId ? null : undefined),
      topic: selectedTopicId ? undefined : topic,
      answer,
      options:
        type === 'mcq' ? options.filter((o) => o.trim() !== '') : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Câu hỏi{' '}
          <span className="text-slate-500">
            (hỗ trợ LaTeX: $x^2$ dạng dòng, $$\frac{'{a}{b}'}$$ dạng khối)
          </span>
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          rows={3}
          className="input-base"
        />
        {question.includes('$') && (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <span className="mr-2 text-xs uppercase tracking-wide text-slate-500">
              Xem trước
            </span>
            <MathText text={question} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Loại</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="input-base"
          >
            <option value="mcq">Trắc nghiệm</option>
            <option value="text">Tự luận</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Độ khó
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="input-base"
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>
      </div>

      {!isLocked && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Lớp <span className="text-slate-500">(tùy chọn)</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedTopicId('');
              }}
              className="input-base"
            >
              <option value="">Không có lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Chủ đề của lớp
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
                    ? 'Lớp chưa có chủ đề nào'
                    : 'Chọn một chủ đề'
                  : 'Chọn lớp trước'}
              </option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isLocked && !selectedTopicId && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Nhãn chủ đề
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required={!selectedTopicId}
            placeholder="ví dụ: đại số"
            className="input-base"
          />
        </div>
      )}

      {type === 'mcq' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">Các lựa chọn</label>
          {options.map((opt, i) => (
            <input
              key={i}
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Lựa chọn ${i + 1}`}
              className="input-base"
            />
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Đáp án đúng
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              placeholder="Phải khớp với một trong các lựa chọn ở trên"
              className="input-base"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Đáp án
          </label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            className="input-base"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
