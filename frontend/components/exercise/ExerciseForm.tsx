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
}: ExerciseFormProps) {
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

  // Optional class-topic link.
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState(initial?.topicId ?? '');

  useEffect(() => {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setTopics([]);
      return;
    }
    apiGet<TopicInfo[]>(`/api/v1/topics?classId=${selectedClassId}`)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [selectedClassId]);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
          Question{' '}
          <span className="text-slate-500">
            (LaTeX supported: $x^2$ inline, $$\frac{'{a}{b}'}$$ block)
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
              Preview
            </span>
            <MathText text={question} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="input-base"
          >
            <option value="mcq">Multiple Choice</option>
            <option value="text">Free Text</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="input-base"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Class <span className="text-slate-500">(optional)</span>
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedTopicId('');
            }}
            className="input-base"
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Class topic
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
                  ? 'No topics in class'
                  : 'Select a topic'
                : 'Pick a class first'}
            </option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedTopicId && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Topic label
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required={!selectedTopicId}
            placeholder="e.g. algebra"
            className="input-base"
          />
        </div>
      )}

      {type === 'mcq' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">Options</label>
          {options.map((opt, i) => (
            <input
              key={i}
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="input-base"
            />
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Correct answer
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              placeholder="Must match one of the options above"
              className="input-base"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Answer
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
