'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type ExerciseType = 'mcq' | 'text';
type Difficulty = 'easy' | 'medium' | 'hard';

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/30';

const selectClass = `${inputClass} [&>option]:bg-slate-900`;

export default function TeacherCreatePage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<ExerciseType>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await apiPost('/api/v1/exercises', {
        question,
        type,
        difficulty,
        topic,
        answer,
        options:
          type === 'mcq' ? options.filter((o) => o.trim() !== '') : undefined,
      });
      router.push('/teacher/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Create Exercise</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExerciseType)}
                className={selectClass}
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
                className={selectClass}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="e.g. algebra"
              className={inputClass}
            />
          </div>

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
                  className={inputClass}
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
                  className={inputClass}
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
                className={inputClass}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating…' : 'Create Exercise'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
